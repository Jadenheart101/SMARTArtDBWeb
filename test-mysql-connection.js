const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMySQLConnection() {
  console.log('🔍 Testing Azure MySQL connection...\n');
  
  // Show configuration (without password)
  console.log('Configuration:');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Port: ${process.env.DB_PORT}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log('');

  // Test different SSL configurations
  const sslConfigs = [
    { name: 'SSL Required (rejectUnauthorized: true)', ssl: { rejectUnauthorized: true } },
    { name: 'SSL Disabled', ssl: false },
    { name: 'SSL with reject unauthorized false', ssl: { rejectUnauthorized: false } },
    { name: 'SSL minimal config', ssl: {} }
  ];

  for (const config of sslConfigs) {
    console.log(`🧪 Testing: ${config.name}`);
    
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: config.ssl,
        connectTimeout: 10000
      });

      console.log('✅ Connection successful!');
      
      // Test a simple query
      const [rows] = await connection.execute('SELECT 1 as test');
      console.log('✅ Query test successful:', rows);
      
      await connection.end();
      console.log('✅ Connection closed cleanly');
      break; // Stop testing once we find a working config
      
    } catch (error) {
      console.log('❌ Failed:', error.message);
      if (error.code) {
        console.log(`   Error code: ${error.code}`);
      }
      if (error.errno) {
        console.log(`   Error number: ${error.errno}`);
      }
    }
    console.log('');
  }
}

testMySQLConnection().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
