-- Script pentru adăugarea coloanelor de progress în tabelul media_files
-- Rulează acest script în PostgreSQL/SQLite pentru a actualiza schema

-- Adaugă coloanele pentru tracking progress
ALTER TABLE media_files 
ADD COLUMN processing_progress REAL DEFAULT 0.0 NOT NULL,
ADD COLUMN processing_eta INTEGER,
ADD COLUMN processing_speed VARCHAR(50),
ADD COLUMN processing_started_at TIMESTAMPTZ;

-- Comentarii pentru clarificare
-- processing_progress: Progresul procentual (0.0 - 100.0)
-- processing_eta: Timpul estimat rămas în secunde  
-- processing_speed: Viteza de procesare (ex: "2.5x")
-- processing_started_at: Când a început procesarea

-- Actualizează toate fișierele existente să aibă progress 100% dacă sunt complete
UPDATE media_files 
SET processing_progress = 100.0 
WHERE processing_status = 'COMPLETED';

-- Verifică modificările
SELECT processing_status, processing_progress, COUNT(*) 
FROM media_files 
GROUP BY processing_status, processing_progress
ORDER BY processing_status;