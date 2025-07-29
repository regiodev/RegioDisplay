# Cale fișier: app/email_utils.py

import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv

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

async def send_email(subject: str, recipients: list, body: str):
    """
    O funcție reutilizabilă pentru a trimite un email.
    """
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=body,
        subtype="html" # Putem trimite email-uri formatate cu HTML
    )
    try:
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"A apărut o eroare la trimiterea email-ului: {e}")
        return False
