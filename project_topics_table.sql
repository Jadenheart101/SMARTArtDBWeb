-- Create project_topics table for storing project topics and their content
CREATE TABLE IF NOT EXISTS project_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    topic_title VARCHAR(255) NOT NULL,
    topic_content TEXT,
    topic_order INT DEFAULT 0,
    is_expanded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(ProjectID) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_topic_order (topic_order)
);

-- Insert sample data for testing (optional)
-- INSERT INTO project_topics (project_id, topic_title, topic_content, topic_order) VALUES
-- (1, 'Project Overview', 'This topic contains general information about the project goals and objectives.', 1),
-- (1, 'Technical Details', 'Technical specifications, requirements, and implementation details.', 2),
-- (1, 'Resources', 'Links, references, and additional materials related to this project.', 3);
