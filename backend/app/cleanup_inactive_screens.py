# Cale: app/cleanup_inactive_screens.py

import os
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import sessionmaker

# Adaugă directorul rădăcină al proiectului în calea Python
# pentru a permite importurile corecte (models, etc.)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import Screen
from app.database import DATABASE_URL

# Perioada de grație: ecranele neactivate mai vechi de 30 de zile vor fi șterse.
# Această valoare poate fi ajustată.
INACTIVE_PERIOD_DAYS = 30

def cleanup_screens():
    """
    Se conectează la baza de date și șterge ecranele care sunt inactive
    de mai mult de INACTIVE_PERIOD_DAYS.
    """
    print("=============================================")
    print(f"[{datetime.now(timezone.utc)}] Pornire script de curățare a ecranelor inactive.")

    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Calculează data limită
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=INACTIVE_PERIOD_DAYS)
        print(f"Data limită pentru ștergere: Ecranele create înainte de {cutoff_date.strftime('%Y-%m-%d %H:%M:%S %Z')} vor fi vizate.")

        # Construiește interogarea de ștergere folosind SQLAlchemy 2.0 style
        stmt = (
            delete(Screen)
            .where(Screen.is_active == False)
            .where(Screen.created_at < cutoff_date)
        )

        # Execută interogarea și obține numărul de rânduri afectate
        result = db.execute(stmt)
        deleted_count = result.rowcount

        # Salvează modificările în baza de date
        db.commit()

        if deleted_count > 0:
            print(f"SUCCES: Au fost șterse {deleted_count} ecrane inactive.")
        else:
            print("INFO: Nu au fost găsite ecrane inactive de șters.")

    except Exception as e:
        print(f"EROARE: A apărut o problemă în timpul rulării scriptului: {e}")
        db.rollback()
    finally:
        db.close()
        print(f"[{datetime.now(timezone.utc)}] Script de curățare finalizat.")
        print("=============================================\n")


if __name__ == "__main__":
    cleanup_screens()
