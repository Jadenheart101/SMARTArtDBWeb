-- Add Admin Notes column to project table
ALTER TABLE project 
ADD COLUMN admin_notes TEXT DEFAULT NULL;
