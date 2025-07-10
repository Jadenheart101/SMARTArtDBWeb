-- Media Files Table for Local Storage
-- This table stores metadata about files uploaded locally

CREATE TABLE IF NOT EXISTS media_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_mime_type (mime_type),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE
);

-- Add some sample data (optional)
-- INSERT INTO media_files (user_id, file_name, original_name, file_path, file_url, mime_type, file_size) 
-- VALUES (1, '1720561234567_sample.jpg', 'sample.jpg', '/path/to/file', '/uploads/user_1/images/1720561234567_sample.jpg', 'image/jpeg', 1024000);
