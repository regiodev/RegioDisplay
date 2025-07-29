import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from . import models, schemas
from .database import get_db
from sqlalchemy.orm import Session

# Configurări
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Context pentru hashing parole
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Schema OAuth2 pentru endpoint-ul de login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password, hashed_password):
    """Verifică dacă parola simplă corespunde cu hash-ul."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generează hash-ul pentru o parolă."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creează un nou token de acces JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Decodifică token-ul și returnează utilizatorul curent."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Subiectul din token este adresa de email
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=email) # Renumirea variabilei ar fi ideală, dar o lăsăm așa
    except JWTError:
        raise credentials_exception

    # --- AICI ESTE CORECȚIA CRITICĂ ---
    # Căutăm utilizatorul după coloana 'email', nu 'username'
    user = db.query(models.User).filter(models.User.email == token_data.username).first()

    if user is None:
        raise credentials_exception
    return user

def create_verification_token(data: dict, expires_delta: timedelta = timedelta(hours=24)):
    """Creează un token JWT special pentru verificarea email-ului, valabil 24 de ore."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "scope": "email_verification"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_password_reset_token(data: dict):
    """Creează un token JWT special pentru resetarea parolei, valabil 15 minute."""
    to_encode = data.copy()
    # Setăm un timp de expirare scurt pentru securitate
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire, "scope": "password_reset"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    """
    O dependință care verifică dacă utilizatorul curent este administrator.
    Dacă nu este, ridică o eroare 403 Forbidden.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action. Admin rights required."
        )
    return current_user
