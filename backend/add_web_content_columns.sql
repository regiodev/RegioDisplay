-- Script pentru adăugarea suportului de conținut web în baza de date
-- Executați în SQL pentru a adăuga noile coloane necesare

-- Adăugare coloane pentru suportul conținutului web în tabela media_files
ALTER TABLE media_files 
ADD COLUMN web_url VARCHAR(2048) NULL,
ADD COLUMN web_refresh_interval INTEGER DEFAULT 30;

-- Comentariu pentru explicație
-- web_url: Stochează URL-ul complet al paginii web (doar pentru type="web/html")
-- web_refresh_interval: Intervalul de refresh în secunde (default 30)

-- Verificare că modificările au fost aplicate
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'media_files' 
AND column_name IN ('web_url', 'web_refresh_interval')
ORDER BY column_name;

-- Exemplu de inserare pentru testare
-- INSERT INTO media_files (filename, path, type, size, web_url, web_refresh_interval, uploaded_by_id, processing_status)
-- VALUES ('Test Web Page', 'web://https://example.com', 'web/html', 0, 'https://example.com', 30, 1, 'COMPLETED');