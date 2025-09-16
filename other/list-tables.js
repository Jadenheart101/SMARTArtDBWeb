const mysql = require('mysql2/promise');
require('dotenv').config();

async function listTables() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    
    const [tables] = await conn.execute('SHOW TABLES');
    console.log('Tables in database:');
    tables.forEach(table => {
      const tableName = table[`Tables_in_${process.env.DB_NAME}`];
      console.log(`  - ${tableName}`);
    });
    
    // Check specifically for topic table
    const [topicCheck] = await conn.execute("SHOW TABLES LIKE 'topic'");
    console.log(`\nTopic table exists: ${topicCheck.length > 0 ? 'YES' : 'NO'}`);
    
    if (topicCheck.length === 0) {
      console.log('Creating topic table...');
      await conn.execute(`
        CREATE TABLE topic (
          TopicID INT PRIMARY KEY,
          Label VARCHAR(255) NOT NULL,
          ProjectID_FK INT,
          FOREIGN KEY (ProjectID_FK) REFERENCES project(ProjectID) ON DELETE CASCADE
        )
      `);
      console.log('✅ Topic table created successfully');
    }
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listTables();
