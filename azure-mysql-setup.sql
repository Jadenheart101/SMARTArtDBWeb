-- SMARTArt Azure MySQL Database Setup
-- Complete schema for Azure MySQL database

-- =======================
-- Core Tables
-- =======================

-- Create user table (core users)
CREATE TABLE IF NOT EXISTS user (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    UserName VARCHAR(255) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    isAdmin TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (UserName),
    INDEX idx_admin (isAdmin)
);

-- Create art table (artwork entries)
CREATE TABLE IF NOT EXISTS art (
    ArtId INT AUTO_INCREMENT PRIMARY KEY,
    ArtistName VARCHAR(255),
    Submitor VARCHAR(255),
    Date DATE,
    ArtMedia INT,
    ArtName VARCHAR(255),
    artcol TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_artist (ArtistName),
    INDEX idx_date (Date),

    FOREIGN KEY (ArtMedia) REFERENCES media_files(id) ON DELETE SET NULL
);

-- Create project table
CREATE TABLE IF NOT EXISTS project (
    ProjectID INT AUTO_INCREMENT PRIMARY KEY,
    ProjectName VARCHAR(255) NOT NULL,
    Description TEXT,
    user_id INT NOT NULL,
    Approved TINYINT DEFAULT 0,
    NeedsReview TINYINT DEFAULT 1,
    Reviewed TINYINT DEFAULT 0,
    DateCreated DATE,
    DateModified DATE,
    DateReviewed DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_approved (Approved),
    INDEX idx_needs_review (NeedsReview),
    
    FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE
);

-- =======================
-- Project System Tables
-- =======================

-- Project Users Association Table (many-to-many relationship)
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

-- Project Topics Table
CREATE TABLE IF NOT EXISTS topic (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    topic_title VARCHAR(255) NOT NULL,
    topic_description TEXT,
    topic_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_id (project_id),
    INDEX idx_topic_order (topic_order),
    
    FOREIGN KEY (project_id) REFERENCES project(ProjectID) ON DELETE CASCADE
);

-- Points of Interest (POI) Table
CREATE TABLE IF NOT EXISTS poi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_id INT NOT NULL,
    poi_local_count INT DEFAULT 0,
    poi_title VARCHAR(255) NOT NULL,
    poi_description TEXT,
    x_coordinate DECIMAL(10, 6),
    y_coordinate DECIMAL(10, 6),
    pLocation VARCHAR(500),
    pImage VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_topic_id (topic_id),
    INDEX idx_coordinates (x_coordinate, y_coordinate),
    
    FOREIGN KEY (topic_id) REFERENCES project_topics(id) ON DELETE CASCADE
);

-- Cards Table
CREATE TABLE IF NOT EXISTS card (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT NOT NULL,
    card_title VARCHAR(255),
    card_body TEXT,
    card_type TINYINT DEFAULT 0,
    card_order INT DEFAULT 0,
    user_notes TEXT,
    references TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_poi_id (poi_id),
    INDEX idx_card_order (card_order),
    
    FOREIGN KEY (poi_id) REFERENCES poi(id) ON DELETE CASCADE
);

-- =======================
-- Media System Tables
-- =======================

-- Media Files Table
CREATE TABLE IF NOT EXISTS media_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_id VARCHAR(255) NOT NULL,
    download_url VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_path TEXT NOT NULL,
    folder_path VARCHAR(255),
    file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_folder VARCHAR(255),
    display_name VARCHAR(255),
    user_id INT NOT NULL,
    
    INDEX idx_user_folder (user_folder),
    INDEX idx_mime_type (mime_type),
    INDEX idx_upload_date (upload_date)

    FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE
);

-- Card Media Association Table
CREATE TABLE IF NOT EXISTS card_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    media_id INT NOT NULL,
    card_id INT NOT NULL,
    card_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_media_id (media_id),
    INDEX idx_card_type (card_type),

    FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES card(id) ON DELETE CASCADE
);

-- =======================
-- Sample Data
-- =======================

-- Insert sample users
INSERT IGNORE INTO user (UserID, UserName, Password, isAdmin) VALUES 
(1, 'admin', 'admin123', 1),
(2, 'testuser', 'password123', 0),
(3, 'artist1', 'artist123', 0);

-- Insert sample artworks
INSERT IGNORE INTO art (ArtId, ArtistName, Submitor, Date, ArtMedia, ArtName, artcol) VALUES 
(1, 'John Doe', 'admin', '2024-01-15', 'Digital', 'Digital Landscape', 'A beautiful digital landscape painting'),
(2, 'Jane Smith', 'testuser', '2024-02-20', 'Acrylic', 'Abstract Colors', 'Vibrant abstract composition'),
(3, 'Artist One', 'artist1', '2023-12-10', 'Oil on Canvas', 'Modern Portrait', 'Contemporary portrait style');

-- Insert sample projects
INSERT IGNORE INTO project (ProjectID, ProjectName, Description, user_id, Approved, NeedsReview, DateCreated, DateModified) VALUES 
(1, 'Sample Art Project', 'A demonstration project showcasing the SMARTArt platform capabilities', 1, 1, 0, '2024-01-01', '2024-01-01'),
(2, 'Community Gallery', 'Collaborative project for local artists to showcase their work', 2, 0, 1, '2024-02-01', '2024-02-01');

-- Set up project ownership
INSERT IGNORE INTO project_users (project_id, user_id, role, added_by) VALUES
(1, 1, 'owner', 1),
(2, 2, 'owner', 2);

-- Insert sample project topics
INSERT IGNORE INTO project_topics (id, project_id, topic_title, topic_content, topic_order) VALUES
(1, 1, 'Project Overview', 'This topic contains general information about the project goals and objectives.', 1),
(2, 1, 'Technical Details', 'Technical specifications, requirements, and implementation details.', 2),
(3, 2, 'Gallery Guidelines', 'Rules and guidelines for submitting artwork to the community gallery.', 1);

-- Insert sample POIs
INSERT IGNORE INTO poi (id, topic_id, poi_title, poi_content, x_coordinate, y_coordinate) VALUES
(1, 1, 'Main Entrance', 'The main entrance to the art installation', 100.5, 200.3),
(2, 1, 'Interactive Display', 'Touch screen display with project information', 250.7, 150.8),
(3, 2, 'Technical Setup Area', 'Area where technical equipment is housed', 300.2, 350.6);

-- Insert sample cards
INSERT IGNORE INTO card (id, poi_id, card_title, card_content, card_order) VALUES
(1, 1, 'Welcome Card', 'Welcome to the SMARTArt experience! This is your starting point.', 1),
(2, 1, 'Navigation Help', 'Use the touch screen to navigate through different areas.', 2),
(3, 2, 'Interactive Features', 'This display shows detailed information about each artwork.', 1);

-- =======================
-- Database Info
-- =======================

-- Show created tables
SELECT 'Database setup completed successfully!' as Status;
SELECT 'Created tables:' as Info;

SHOW TABLES;
