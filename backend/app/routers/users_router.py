# Cale fișier: app/routers/users_router.py

import os
import re
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas, auth
from ..database import get_db
from ..email_utils import send_email

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# --- FUNCȚIE PENTRU VALIDAREA PAROLEI ---
def validate_password_complexity(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Parola trebuie să conțină cel puțin 8 caractere.")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Parola trebuie să conțină cel puțin o majusculă.")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Parola trebuie să conțină cel puțin o cifră.")
    # Verificăm dacă parola conține și litere (nu doar cifre și o majusculă)
    if not re.search(r"[a-zA-Z]", password):
        raise HTTPException(status_code=400, detail="Parola trebuie să conțină litere.")
# --- SFÂRȘIT FUNCȚIE ---


@router.get("/me", response_model=schemas.UserPublic)
def read_users_me(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returnează datele utilizatorului curent autentificat.
    Calculează și spațiul de stocare utilizat.
    """
    current_usage_bytes = db.query(func.sum(models.MediaFile.size)).filter(
        models.MediaFile.uploaded_by_id == current_user.id
    ).scalar() or 0

    current_user.current_usage_mb = round(current_usage_bytes / (1024 * 1024), 2)

    return current_user


@router.post("/", response_model=schemas.UserPublic, status_code=201)
async def create_user(
    user: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    validate_password_complexity(user.password)

    db_user_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_email:
        raise HTTPException(status_code=400, detail="Adresa de email este deja înregistrată.")

    db_user_username = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user_username:
        raise HTTPException(status_code=400, detail="Numele de utilizator este deja folosit.")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        username=user.username,
        password_hash=hashed_password,
        is_admin=user.is_admin,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = auth.create_verification_token(data={"sub": new_user.email})
    
    # --- AICI ESTE MODIFICAREA CRITICĂ ---
    # Link-ul de verificare va apela direct endpoint-ul de pe backend.
    backend_api_url = "https://display.regio-cloud.ro/api"
    verification_link = f"{backend_api_url}/auth/verify-email?token={token}"
    logo_url = "https://display.regio-cloud.ro/static/logo.png"

    text_body = f"""
    Bun venit la RegioDisplay!
    
    Pentru a finaliza înregistrarea și a vă activa contul, vă rugăm accesați următorul link:
    {verification_link}
    
    Dacă nu dumneavoastră ați solicitat această înregistrare, vă rugăm să ignorați acest email.
    
    O zi bună,
    Echipa RegioDisplay
    """

    html_body = f"""
    <!DOCTYPE html>
    <html lang="ro">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Activare Cont RegioDisplay</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <img src="{logo_url}" alt="RegioDisplay Logo" style="max-width: 200px; margin-bottom: 20px;">
                                <h1 style="color: #333333;">Bun venit, {user.username}!</h1>
                                <p style="color: #555555; line-height: 1.6;">Vă mulțumim pentru înregistrarea în platforma RegioDisplay. Mai este un singur pas pentru a vă activa contul.</p>
                                <p style="margin: 30px 0;">
                                    <a href="{verification_link}" style="background-color: #007bff; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Activează Contul</a>
                                </p>
                                <p style="color: #555555; line-height: 1.6;">Dacă butonul de mai sus nu funcționează, copiați și inserați următorul link în browser:</p>
                                <p style="word-break: break-all;"><a href="{verification_link}" style="color: #007bff;">{verification_link}</a></p>
                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 40px 0;">
                                <p style="font-size: 12px; color: #999999;">Dacă nu dumneavoastră ați solicitat această înregistrare, vă rugăm să ignorați acest email.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    background_tasks.add_task(
        send_email,
        "Activare Cont RegioDisplay",
        [user.email],
        text_body,
        html_body=html_body
    )

    return new_user
