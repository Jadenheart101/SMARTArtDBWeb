const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Setting up Azure MySQL Database Schema...\n');
  
  try {
    // Connect to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000
    });

    console.log('✅ Connected to Azure MySQL successfully\n');

    // Create tables based on your application structure
    const tables = [
      {
        name: 'user',
        sql: `
          CREATE TABLE IF NOT EXISTS user (
            UserID INT AUTO_INCREMENT PRIMARY KEY,
            UserName VARCHAR(255) NOT NULL UNIQUE,
            Password VARCHAR(255) NOT NULL,
            isAdmin TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      },
      {
        name: 'art',
        sql: `
          CREATE TABLE IF NOT EXISTS art (
            ArtId INT AUTO_INCREMENT PRIMARY KEY,
            Title VARCHAR(255) NOT NULL,
            Artist VARCHAR(255) NOT NULL,
            Year INT,
            Medium VARCHAR(255),
            Description TEXT,
            ImageURL VARCHAR(500),
            Price DECIMAL(10, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      },
      {
        name: 'project',
        sql: `
          CREATE TABLE IF NOT EXISTS project (
            ProjectID INT AUTO_INCREMENT PRIMARY KEY,
            ProjectName VARCHAR(255) NOT NULL,
            Description TEXT,
            user_id INT NOT NULL,
            Approved TINYINT(1) DEFAULT 0,
            NeedsReview TINYINT(1) DEFAULT 1,
            DateCreated DATE,
            DateModified DATE,
            FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      },
      {
        name: 'media_files',
        sql: `
          CREATE TABLE IF NOT EXISTS media_files (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size BIGINT NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_folder VARCHAR(255),
            display_name VARCHAR(255)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      },
      {
        name: 'card_media',
        sql: `
          CREATE TABLE IF NOT EXISTS card_media (
            id INT AUTO_INCREMENT PRIMARY KEY,
            media_id INT NOT NULL,
            card_type VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      }
    ];

    // Create each table
    for (const table of tables) {
      try {
        console.log(`📋 Creating table: ${table.name}`);
        await connection.execute(table.sql);
        console.log(`✅ Table '${table.name}' created successfully`);
      } catch (error) {
        console.error(`❌ Error creating table '${table.name}':`, error.message);
      }
    }

    console.log('\n🔧 Creating indexes for better performance...');

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_username ON user(UserName)',
      'CREATE INDEX IF NOT EXISTS idx_art_artist ON art(Artist)',
      'CREATE INDEX IF NOT EXISTS idx_project_user_id ON project(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_media_files_user_folder ON media_files(user_folder)',
      'CREATE INDEX IF NOT EXISTS idx_card_media_media_id ON card_media(media_id)'
    ];

    for (const indexSql of indexes) {
      try {
        await connection.execute(indexSql);
        console.log('✅ Index created');
      } catch (error) {
        console.log(`⚠️  Index may already exist: ${error.message}`);
      }
    }

    console.log('\n🎯 Inserting sample data...');

    // Insert sample data
    try {
      // Sample users
      await connection.execute(`
        INSERT IGNORE INTO user (UserName, Password, isAdmin) VALUES 
        ('admin', 'admin123', 1),
        ('testuser', 'password123', 0),
        ('artist1', 'artist123', 0)
      `);
      console.log('✅ Sample users created');

      // Sample artworks
      await connection.execute(`
        INSERT IGNORE INTO art (Title, Artist, Year, Medium, Description, Price) VALUES 
        ('Digital Landscape', 'John Doe', 2024, 'Digital', 'A beautiful digital landscape painting', 500.00),
        ('Abstract Colors', 'Jane Smith', 2024, 'Acrylic', 'Vibrant abstract composition', 750.00),
        ('Modern Portrait', 'Artist One', 2023, 'Oil on Canvas', 'Contemporary portrait style', 1200.00)
      `);
      console.log('✅ Sample artworks created');

    } catch (error) {
      console.log(`⚠️  Sample data may already exist: ${error.message}`);
    }

    await connection.end();
    console.log('\n🎉 Database setup completed successfully!');
    console.log('🔍 Run "node show-database-tables.js" to see the created tables');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

// Run the setup
setupDatabase().then(() => {
  console.log('\n✅ Setup process finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
});
