# Cale fișier: app/email_utils.py

import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv
from typing import Optional

load_dotenv() # Asigură-te că variabilele din .env sunt încărcate

# Configurăm conexiunea folosind variabilele de mediu
conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"),
    MAIL_FROM = os.getenv("MAIL_FROM"),
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER = os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

fm = FastMail(conf)

async def send_email(subject: str, recipients: list, body: str, html_body: Optional[str] = None):
    """
    O funcție reutilizabilă pentru a trimite un email.
    Poate trimite email-uri multipart (text și HTML).
    """
    
    # --- AICI ESTE MODIFICAREA FINALĂ ---
    # Dacă avem un corp HTML, îl folosim ca fiind conținutul principal
    # și setăm subtipul la 'html' pentru a garanta formatarea corectă.
    if html_body:
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=html_body,  # Folosim direct corpul HTML
            subtype="html"
        )
    else:
        # Altfel, trimitem un email text simplu
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body,
            subtype="plain"
        )
    # --- SFÂRȘIT MODIFICARE ---

    try:
        await fm.send_message(message)
        print(f"INFO: Email trimis cu succes către: {recipients}")
        return True
    except Exception as e:
        print(f"EROARE CRITICĂ la trimiterea email-ului: {e}")
        return False
