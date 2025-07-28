-- Add pLocation column to poi table for storing location descriptions
-- Run this command to add the location description field to existing POI records

ALTER TABLE poi ADD COLUMN IF NOT EXISTS pLocation TEXT DEFAULT NULL;

-- Optional: Update existing POIs with sample location descriptions
-- UPDATE poi SET pLocation = 'Location description not yet provided' WHERE pLocation IS NULL;
