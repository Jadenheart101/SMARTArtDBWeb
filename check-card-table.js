const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCardTable() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    
    const [desc] = await conn.execute('DESCRIBE card');
    console.log('Card table structure:');
    desc.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - Null:${col.Null} - Key:${col.Key} - Default:${col.Default}`);
    });
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCardTable();
