-- Fix database schema inconsistencies and create missing topic table
USE stoutsmartart-database;

-- Create topic table if it doesn't exist (it should match project_topics but with correct name)
CREATE TABLE IF NOT EXISTS topic (
    TopicID INT PRIMARY KEY,
    Label VARCHAR(255) NOT NULL,
    ProjectID_FK INT,
    FOREIGN KEY (ProjectID_FK) REFERENCES project(ProjectID) ON DELETE CASCADE
);

-- Copy data from project_topics to topic if project_topics has data
INSERT IGNORE INTO topic (TopicID, Label, ProjectID_FK)
SELECT topicId, topicLabel, projectId FROM project_topics;
