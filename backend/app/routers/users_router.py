# Cale fișier: app/routers/users_router.py

import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db
from ..email_utils import send_email # Importăm funcția de email

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# Endpoint public pentru a crea un utilizator
@router.post("/", response_model=schemas.UserPublic, status_code=201)
async def create_user(
    user: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    db_user_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user_username = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        username=user.username,
        password_hash=hashed_password,
        is_admin=user.is_admin,
        is_verified=False # Utilizatorul nou nu este verificat
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Trimiterea email-ului de verificare în fundal
    token = auth.create_verification_token(data={"sub": new_user.email})
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verification_link = f"{frontend_url}/api/auth/verify-email?token={token}"

    email_body = f"""
    <p>Bun venit! Vă mulțumim pentru înregistrare.</p>
    <p>Vă rugăm să apăsați pe link-ul de mai jos pentru a vă activa contul:</p>
    <p><a href="{verification_link}">{verification_link}</a></p>
    """

    background_tasks.add_task(
        send_email,
        "Activare Cont RegioDisplay",
        [user.email],
        email_body
    )

    return new_user

# Endpoint protejat
@router.get("/me", response_model=schemas.UserPublic)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
