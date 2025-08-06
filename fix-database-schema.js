const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema issues...');
  
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

    // Check if topic table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'topic'");
    
    if (tables.length === 0) {
      console.log('Creating topic table...');
      
      // Create topic table
      await connection.execute(`
        CREATE TABLE topic (
          TopicID INT PRIMARY KEY,
          Label VARCHAR(255) NOT NULL,
          ProjectID_FK INT,
          FOREIGN KEY (ProjectID_FK) REFERENCES project(ProjectID) ON DELETE CASCADE
        )
      `);
      
      console.log('✅ Topic table created');
      
      // Check if project_topics has data to migrate
      const [projectTopics] = await connection.execute('SELECT * FROM project_topics LIMIT 5');
      
      if (projectTopics.length > 0) {
        console.log('Migrating data from project_topics to topic...');
        
        // Copy data from project_topics to topic
        await connection.execute(`
          INSERT INTO topic (TopicID, Label, ProjectID_FK)
          SELECT topicId, topicLabel, projectId FROM project_topics
        `);
        
        console.log('✅ Data migrated to topic table');
      }
    } else {
      console.log('✅ Topic table already exists');
    }

    await connection.end();
    console.log('✅ Database schema fix completed');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
  }
}

fixDatabaseSchema();
