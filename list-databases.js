const mysql = require('mysql2/promise');
require('dotenv').config();

async function listDatabases() {
  console.log('🔍 Connecting to Azure MySQL to list databases...\n');
  
  try {
    // Connect without specifying a database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000
    });

    console.log('✅ Connected successfully!');
    
    // List all databases
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('\n📋 Available databases:');
    databases.forEach(db => {
      console.log(`  - ${db.Database}`);
    });
    
    await connection.end();
    console.log('\n✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

listDatabases().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
