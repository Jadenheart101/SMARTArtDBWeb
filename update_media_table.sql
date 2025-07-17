-- Update media_files table for local storage
-- This migrates from OneDrive schema to local storage schema

-- Add new columns for local storage
ALTER TABLE media_files 
ADD COLUMN file_path TEXT,
ADD COLUMN file_url VARCHAR(500);

-- Update existing records (if any) to use local paths
-- This is a one-time migration - adjust as needed for your data

-- Drop old OneDrive-specific columns (optional - uncomment if you want to clean up)
-- ALTER TABLE media_files DROP COLUMN file_id;
-- ALTER TABLE media_files DROP COLUMN download_url;
-- ALTER TABLE media_files DROP COLUMN folder_path;

-- Update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_path ON media_files(file_path(255));

-- Migration: Add displayName to media_files table
ALTER TABLE media_files ADD COLUMN displayName VARCHAR(255) DEFAULT NULL AFTER original_name;
