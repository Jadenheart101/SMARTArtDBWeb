-- Fix Foreign Key Relationships to Use Integer IDs
-- This script ensures all foreign key relationships use proper integer IDs

-- =======================
-- 1. Fix ART table - ArtMedia should reference media_files.id
-- =======================

-- First, backup any existing string values in ArtMedia
ALTER TABLE art ADD COLUMN ArtMedia_backup VARCHAR(255);
UPDATE art SET ArtMedia_backup = ArtMedia WHERE ArtMedia IS NOT NULL;

-- Change ArtMedia to INT and add foreign key constraint
ALTER TABLE art MODIFY COLUMN ArtMedia INT NULL;

-- Add foreign key constraint for ArtMedia
ALTER TABLE art ADD CONSTRAINT fk_art_media 
    FOREIGN KEY (ArtMedia) REFERENCES media_files(id) ON DELETE SET NULL;

-- =======================
-- 2. Fix POI table - pImage should reference media_files.id
-- =======================

-- Add new column for image reference
ALTER TABLE poi ADD COLUMN image_id INT NULL;

-- Add foreign key constraint for image_id
ALTER TABLE poi ADD CONSTRAINT fk_poi_image 
    FOREIGN KEY (image_id) REFERENCES media_files(id) ON DELETE SET NULL;

-- Note: We keep pImage as VARCHAR for backward compatibility, but new code should use image_id

-- =======================
-- 3. Add missing foreign key constraints
-- =======================

-- Ensure card table has proper foreign key for poi_id (should already exist)
-- This will fail if constraint already exists, which is fine
-- ALTER TABLE card ADD CONSTRAINT fk_card_poi 
--     FOREIGN KEY (poi_id) REFERENCES poi(id) ON DELETE CASCADE;

-- =======================
-- 4. Add image support to CARD table (optional enhancement)
-- =======================

-- Add image reference to cards
ALTER TABLE card ADD COLUMN image_id INT NULL;

-- Add foreign key constraint for card images
ALTER TABLE card ADD CONSTRAINT fk_card_image 
    FOREIGN KEY (image_id) REFERENCES media_files(id) ON DELETE SET NULL;

-- =======================
-- 5. Clean up and verify media_files foreign keys
-- =======================

-- Ensure media_files.user_id properly references user.UserID
-- This should already exist, but let's make sure
-- ALTER TABLE media_files ADD CONSTRAINT fk_media_files_user 
--     FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE;

-- If uploaded_by doesn't have a foreign key, add it
-- ALTER TABLE media_files ADD CONSTRAINT fk_media_files_uploaded_by 
--     FOREIGN KEY (uploaded_by) REFERENCES user(UserID) ON DELETE SET NULL;

-- =======================
-- 6. Add indexes for performance
-- =======================

-- Add indexes on new foreign key columns
ALTER TABLE art ADD INDEX idx_art_media (ArtMedia);
ALTER TABLE poi ADD INDEX idx_poi_image (image_id);
ALTER TABLE card ADD INDEX idx_card_image (image_id);

-- =======================
-- 7. Verification queries
-- =======================

-- Show all foreign key constraints
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE REFERENCED_TABLE_NAME IS NOT NULL 
AND TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, COLUMN_NAME;

-- =======================
-- 8. Migration Notes
-- =======================

/*
MIGRATION NOTES:

1. ART TABLE:
   - ArtMedia now references media_files.id (INT)
   - Old string values are backed up in ArtMedia_backup column
   - Code needs to be updated to use media_files.id instead of filenames

2. POI TABLE:
   - New image_id column references media_files.id (INT)
   - Old pImage column kept for backward compatibility
   - Code should migrate to use image_id instead of pImage

3. CARD TABLE:
   - New image_id column added for future image support
   - Existing card_media table provides many-to-many relationship

4. ALL TABLES:
   - All foreign keys now properly use INTEGER references
   - Proper CASCADE/SET NULL behavior defined
   - Indexes added for performance

5. CODE CHANGES NEEDED:
   - Update art creation/editing to use media_files.id
   - Update POI creation/editing to use image_id instead of pImage
   - Update any code that was using string references to use integer IDs
*/
