const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkArtTable() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    
    const [desc] = await conn.execute('DESCRIBE art');
    console.log('Art table structure:');
    desc.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - Null:${col.Null} - Key:${col.Key} - Default:${col.Default}`);
    });
    
    // Check if there's any data
    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM art');
    console.log(`\nCurrent art records: ${rows[0].count}`);
    
    // Try to get the max ID
    const [maxId] = await conn.execute('SELECT MAX(ArtId) as maxId FROM art');
    console.log(`Max ArtId: ${maxId[0].maxId}`);
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkArtTable();
