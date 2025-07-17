from fastapi import FastAPI
from . import models
from .database import engine
from .routers import auth_router, users_router, media_router, playlist_router, screen_router, client_router # Importă routerele


# Această linie crează tabelele în baza de date pe baza modelelor definite
# ATENȚIE: Într-o aplicație de producție, migrațiile se fac cu unelte ca Alembic.

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Digital Signage Management API",
    description="Backend-ul pentru sistemul de management de conținut media.",
    version="1.0.0"
)

# Include routerele în aplicație
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(media_router.router)
app.include_router(playlist_router.router)
app.include_router(screen_router.router)
app.include_router(client_router.router)

@app.get("/", tags=["Root"])
def read_root():
    """Endpoint de test pentru a verifica dacă API-ul este funcțional."""
    return {"message": "Bun venit la Signage Management API!"}
