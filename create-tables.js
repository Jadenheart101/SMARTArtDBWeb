const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTables() {
  console.log('🚀 Creating database tables...\n');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000
    });

    console.log('✅ Connected to Azure MySQL database\n');
    
    // Create tables one by one
    const tables = [
      {
        name: 'user',
        sql: `CREATE TABLE IF NOT EXISTS user (
          UserID INT AUTO_INCREMENT PRIMARY KEY,
          UserName VARCHAR(255) NOT NULL UNIQUE,
          Password VARCHAR(255) NOT NULL,
          isAdmin TINYINT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_username (UserName),
          INDEX idx_admin (isAdmin)
        )`
      },
      {
        name: 'art',
        sql: `CREATE TABLE IF NOT EXISTS art (
          ArtId INT AUTO_INCREMENT PRIMARY KEY,
          ArtistName VARCHAR(255),
          Submitor VARCHAR(255),
          Date DATE,
          ArtMedia VARCHAR(255),
          ArtName VARCHAR(255),
          artcol TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_artist (ArtistName),
          INDEX idx_date (Date)
        )`
      },
      {
        name: 'project',
        sql: `CREATE TABLE IF NOT EXISTS project (
          ProjectID INT AUTO_INCREMENT PRIMARY KEY,
          ProjectName VARCHAR(255) NOT NULL,
          Description TEXT,
          user_id INT NOT NULL,
          Approved TINYINT DEFAULT 0,
          NeedsReview TINYINT DEFAULT 1,
          DateCreated DATE,
          DateModified DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_approved (Approved),
          INDEX idx_needs_review (NeedsReview),
          FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE
        )`
      },
      {
        name: 'project_users',
        sql: `CREATE TABLE IF NOT EXISTS project_users (
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
        )`
      },
      {
        name: 'project_topics',
        sql: `CREATE TABLE IF NOT EXISTS project_topics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          topic_title VARCHAR(255) NOT NULL,
          topic_content TEXT,
          topic_order INT DEFAULT 0,
          is_expanded BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_project_id (project_id),
          INDEX idx_topic_order (topic_order),
          FOREIGN KEY (project_id) REFERENCES project(ProjectID) ON DELETE CASCADE
        )`
      },
      {
        name: 'poi',
        sql: `CREATE TABLE IF NOT EXISTS poi (
          id INT AUTO_INCREMENT PRIMARY KEY,
          topic_id INT NOT NULL,
          poi_title VARCHAR(255) NOT NULL,
          poi_content TEXT,
          x_coordinate DECIMAL(10, 6),
          y_coordinate DECIMAL(10, 6),
          pLocation VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_topic_id (topic_id),
          INDEX idx_coordinates (x_coordinate, y_coordinate),
          FOREIGN KEY (topic_id) REFERENCES project_topics(id) ON DELETE CASCADE
        )`
      },
      {
        name: 'card',
        sql: `CREATE TABLE IF NOT EXISTS card (
          id INT AUTO_INCREMENT PRIMARY KEY,
          poi_id INT NOT NULL,
          card_title VARCHAR(255),
          card_content TEXT,
          card_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_poi_id (poi_id),
          INDEX idx_card_order (card_order),
          FOREIGN KEY (poi_id) REFERENCES poi(id) ON DELETE CASCADE
        )`
      },
      {
        name: 'media_files',
        sql: `CREATE TABLE IF NOT EXISTS media_files (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_size BIGINT,
          mime_type VARCHAR(100),
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_folder VARCHAR(255),
          display_name VARCHAR(255),
          INDEX idx_user_folder (user_folder),
          INDEX idx_mime_type (mime_type),
          INDEX idx_upload_date (upload_date)
        )`
      },
      {
        name: 'card_media',
        sql: `CREATE TABLE IF NOT EXISTS card_media (
          id INT AUTO_INCREMENT PRIMARY KEY,
          media_id INT NOT NULL,
          card_type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_media_id (media_id),
          INDEX idx_card_type (card_type),
          FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE CASCADE
        )`
      }
    ];
    
    // Create each table
    for (const table of tables) {
      try {
        await connection.execute(table.sql);
        console.log(`✅ Created table: ${table.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Table ${table.name} already exists`);
        } else {
          console.log(`❌ Error creating table ${table.name}: ${error.message}`);
        }
      }
    }
    
    // Insert sample data
    console.log('\n📝 Inserting sample data...');
    
    // Sample users
    try {
      await connection.execute(`INSERT IGNORE INTO user (UserID, UserName, Password, isAdmin) VALUES 
        (1, 'admin', 'admin123', 1),
        (2, 'testuser', 'password123', 0),
        (3, 'artist1', 'artist123', 0)`);
      console.log('✅ Inserted sample users');
    } catch (error) {
      console.log('ℹ️  Sample users already exist or error:', error.message);
    }
    
    // Sample artworks
    try {
      await connection.execute(`INSERT IGNORE INTO art (ArtId, ArtistName, Submitor, Date, ArtMedia, ArtName, artcol) VALUES 
        (1, 'John Doe', 'admin', '2024-01-15', 'Digital', 'Digital Landscape', 'A beautiful digital landscape painting'),
        (2, 'Jane Smith', 'testuser', '2024-02-20', 'Acrylic', 'Abstract Colors', 'Vibrant abstract composition'),
        (3, 'Artist One', 'artist1', '2023-12-10', 'Oil on Canvas', 'Modern Portrait', 'Contemporary portrait style')`);
      console.log('✅ Inserted sample artworks');
    } catch (error) {
      console.log('ℹ️  Sample artworks already exist or error:', error.message);
    }
    
    // Sample projects
    try {
      await connection.execute(`INSERT IGNORE INTO project (ProjectID, ProjectName, Description, user_id, Approved, NeedsReview, DateCreated, DateModified) VALUES 
        (1, 'Sample Art Project', 'A demonstration project showcasing the SMARTArt platform capabilities', 1, 1, 0, '2024-01-01', '2024-01-01'),
        (2, 'Community Gallery', 'Collaborative project for local artists to showcase their work', 2, 0, 1, '2024-02-01', '2024-02-01')`);
      console.log('✅ Inserted sample projects');
    } catch (error) {
      console.log('ℹ️  Sample projects already exist or error:', error.message);
    }
    
    // Verify setup
    console.log('\n🔍 Verifying database setup...');
    const [tables_result] = await connection.execute('SHOW TABLES');
    
    console.log(`\n🎉 Database setup completed!`);
    console.log(`📊 Total tables: ${tables_result.length}`);
    
    console.log('\n📋 Created tables:');
    tables_result.forEach(table => {
      const tableName = table[`Tables_in_${process.env.DB_NAME}`];
      console.log(`  ✅ ${tableName}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

createTables().then(() => {
  console.log('\n🚀 Your database is ready!');
  console.log('💡 You can now start your server with: npm start');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Setup failed:', error.message);
  process.exit(1);
});
