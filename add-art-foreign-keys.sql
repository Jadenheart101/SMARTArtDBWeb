-- Add foreign key columns to art table for proper relationship tracking
-- This will fix the orphan detection logic that currently uses string-based lookups

ALTER TABLE art 
ADD COLUMN media_id INT DEFAULT NULL,
ADD COLUMN project_id INT DEFAULT NULL;

-- Add foreign key constraints to ensure data integrity
ALTER TABLE art 
ADD CONSTRAINT fk_art_media 
    FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_art_project 
    FOREIGN KEY (project_id) REFERENCES project(ProjectID) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_art_media_id ON art(media_id);
CREATE INDEX idx_art_project_id ON art(project_id);
