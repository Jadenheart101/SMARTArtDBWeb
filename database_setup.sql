-- SMARTArt Database Schema
-- Run these commands in your Railway database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('user', 'artist', 'curator', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create artworks table
CREATE TABLE IF NOT EXISTS artworks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    year INT,
    medium VARCHAR(255),
    description TEXT,
    image_url VARCHAR(500),
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, role) VALUES 
('John Doe', 'john@example.com', 'artist'),
('Jane Smith', 'jane@example.com', 'curator'),
('Admin User', 'admin@smartart.com', 'admin');

INSERT INTO artworks (title, artist, year, medium, description, price) VALUES 
('Digital Landscape', 'John Doe', 2024, 'Digital', 'A beautiful digital landscape painting', 500.00),
('Abstract Colors', 'Jane Smith', 2024, 'Acrylic', 'Vibrant abstract composition', 750.00),
('Modern Portrait', 'John Doe', 2023, 'Oil on Canvas', 'Contemporary portrait style', 1200.00);

-- Create project table for user projects
CREATE TABLE IF NOT EXISTS project (
    ProjectID INT AUTO_INCREMENT PRIMARY KEY,
    ProjectName VARCHAR(255) NOT NULL,
    Description TEXT,
    user_id INT NOT NULL,
    Approved TINYINT DEFAULT 0,
    NeedsReview TINYINT DEFAULT 1,
    DateCreated DATE,
    DateModified DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
