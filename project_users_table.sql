-- Project Users Association Table
-- This table stores many-to-many relationships between projects and users
-- Users added to projects get edit permissions

CREATE TABLE IF NOT EXISTS project_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'editor') DEFAULT 'editor',
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT,
    
    UNIQUE KEY unique_project_user (project_id, user_id),
    INDEX idx_project_id (project_id),
    INDEX idx_user_id (user_id),
    
    FOREIGN KEY (project_id) REFERENCES project(ProjectID) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES user(UserID) ON DELETE SET NULL
);

-- Migrate existing projects to the new system
-- Each existing project will have its creator as the owner
INSERT IGNORE INTO project_users (project_id, user_id, role, added_by)
SELECT ProjectID, user_id, 'owner', user_id 
FROM project;
