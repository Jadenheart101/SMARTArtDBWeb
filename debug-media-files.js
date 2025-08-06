const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMediaFilesTable() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('Checking media_files table structure...');
    const [desc] = await conn.execute('DESCRIBE media_files');
    desc.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - Null:${col.Null} - Key:${col.Key} - Default:${col.Default}`);
    });
    
    // Check existing data
    const [rows] = await conn.execute('SELECT * FROM media_files LIMIT 5');
    console.log('\nExisting media_files records:');
    rows.forEach(row => {
      console.log(`  ID: ${row.id}, User ID: ${row.user_id}, File: ${row.file_name}`);
    });
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMediaFilesTable();
