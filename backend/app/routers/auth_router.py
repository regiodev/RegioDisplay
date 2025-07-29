# Cale fișier: app/routers/auth_router.py

import os
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from .. import auth, models, schemas
from ..database import get_db
from ..email_utils import send_email

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# ... funcțiile login și verify_email rămân la fel ...

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in.",
        )

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("scope") != "email_verification":
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception

    if not user.is_verified:
        user.is_verified = True
        db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/login?verified=true")


@router.post("/forgot-password")
async def forgot_password(
    payload: schemas.ForgotPasswordSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        return {"detail": "If an account with this email exists, a password reset link has been sent."}

    # --- AICI ESTE CORECȚIA ---
    # Folosim noua funcție dedicată pentru a crea token-ul
    token = auth.create_password_reset_token(data={"sub": user.email})

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    email_body = f"""
    <p>Ați solicitat o resetare a parolei.</p>
    <p>Apăsați pe link-ul de mai jos pentru a seta o parolă nouă. Link-ul este valabil 15 minute.</p>
    <p><a href="{reset_link}">{reset_link}</a></p>
    """

    background_tasks.add_task(
        send_email,
        "Resetare Parolă Cont RegioDisplay",
        [user.email],
        email_body
    )

    return {"detail": "If an account with this email exists, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(
    payload: schemas.ResetPasswordSchema,
    db: Session = Depends(get_db)
):
    try:
        token_payload = jwt.decode(payload.token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if token_payload.get("scope") != "password_reset":
            raise HTTPException(status_code=401, detail="Invalid token scope")

        email = token_payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_hashed_password = auth.get_password_hash(payload.new_password)
    user.password_hash = new_hashed_password
    db.commit()

    return {"detail": "Password has been reset successfully."}
