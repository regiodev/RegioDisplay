# Serviciu pentru generarea de thumbnail-uri pentru conținutul web
# Folosește Playwright pentru a face screenshot-uri ale paginilor web

import os
import uuid
import asyncio
import aiofiles
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class WebThumbnailService:
    def __init__(self, thumbnails_dir: str):
        self.thumbnails_dir = Path(thumbnails_dir)
        self.thumbnails_dir.mkdir(parents=True, exist_ok=True)
        self._browser = None
        self._playwright = None
        
    async def _get_browser(self):
        """Inițializează browser-ul Playwright dacă nu există"""
        if self._browser is None:
            try:
                from playwright.async_api import async_playwright
                self._playwright = await async_playwright().start()
                
                # Folosim chromium pentru compatibilitate maximă
                self._browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--no-first-run',
                        '--no-default-browser-check',
                        '--disable-default-apps',
                        '--disable-extensions'
                    ]
                )
                logger.info("Playwright browser initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Playwright browser: {e}")
                raise
                
        return self._browser
    
    async def generate_thumbnail(self, url: str, width: int = 800, height: int = 600) -> Optional[str]:
        """
        Generează un thumbnail pentru o pagină web
        
        Args:
            url: URL-ul paginii web
            width: Lățimea screenshot-ului
            height: Înălțimea screenshot-ului
            
        Returns:
            Calea relativă către thumbnail sau None în caz de eroare
        """
        try:
            browser = await self._get_browser()
            
            # Creează un context nou pentru fiecare screenshot
            context = await browser.new_context(
                viewport={'width': width, 'height': height},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            page = await context.new_page()
            
            # Set timeout pentru încărcare
            page.set_default_timeout(30000)  # 30 secunde
            
            try:
                # Navighează la pagină
                logger.info(f"Loading page: {url}")
                await page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Așteaptă un pic pentru ca pagina să se încarce complet
                await asyncio.sleep(2)
                
                # Generează numele fișierului
                thumbnail_filename = f"web_thumb_{uuid.uuid4().hex[:12]}.jpg"
                thumbnail_path = self.thumbnails_dir / thumbnail_filename
                
                # Fă screenshot-ul
                await page.screenshot(
                    path=thumbnail_path,
                    type='jpeg',
                    quality=80,
                    full_page=False  # Doar viewport-ul vizibil
                )
                
                logger.info(f"Generated thumbnail for {url}: {thumbnail_filename}")
                return thumbnail_filename
                
            finally:
                await context.close()
                
        except Exception as e:
            logger.error(f"Failed to generate thumbnail for {url}: {e}")
            return None
    
    async def cleanup(self):
        """Curăță resursele browser-ului"""
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._browser = None
        self._playwright = None
    
    async def delete_thumbnail(self, thumbnail_filename: str) -> bool:
        """Șterge un thumbnail existent"""
        try:
            thumbnail_path = self.thumbnails_dir / thumbnail_filename
            if thumbnail_path.exists():
                thumbnail_path.unlink()
                logger.info(f"Deleted thumbnail: {thumbnail_filename}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete thumbnail {thumbnail_filename}: {e}")
            return False

# Instance globală pentru serviciu
_web_thumbnail_service = None

def get_web_thumbnail_service() -> WebThumbnailService:
    """Singleton pentru serviciul de thumbnail-uri web"""
    global _web_thumbnail_service
    if _web_thumbnail_service is None:
        # Folosește același director ca pentru thumbnail-urile normale
        from ..config import get_settings
        settings = get_settings()
        thumbnails_dir = Path(settings.upload_path) / "thumbnails"
        _web_thumbnail_service = WebThumbnailService(str(thumbnails_dir))
    return _web_thumbnail_service