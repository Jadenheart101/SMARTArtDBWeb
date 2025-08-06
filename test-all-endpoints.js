const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'http://localhost:8080';

async function testAllEndpoints() {
  console.log('🧪 Comprehensive API Testing and Database Fixing\n');
  
  try {
    // First, let's check what tables we actually have
    console.log('🔍 Checking current database structure...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000
    });

    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Current tables:');
    tables.forEach(table => {
      const tableName = table[`Tables_in_${process.env.DB_NAME}`];
      console.log(`  - ${tableName}`);
    });

    // Now let's test each endpoint and identify missing tables
    const tests = [
      {
        name: 'Test Users API',
        endpoint: '/api/users',
        method: 'GET'
      },
      {
        name: 'Test Art API',
        endpoint: '/api/art',
        method: 'GET'
      },
      {
        name: 'Test Projects API',
        endpoint: '/api/projects',
        method: 'GET'
      },
      {
        name: 'Test Media Files API',
        endpoint: '/api/media/files',
        method: 'GET'
      },
      {
        name: 'Test Project Topics API',
        endpoint: '/api/projects/1/topics',
        method: 'GET'
      }
    ];

    console.log('\n🧪 Testing API endpoints...\n');
    
    for (const test of tests) {
      try {
        console.log(`Testing: ${test.name}`);
        const response = await axios({
          method: test.method,
          url: `${BASE_URL}${test.endpoint}`,
          timeout: 5000
        });
        console.log(`✅ ${test.name} - Status: ${response.status}`);
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${test.name} - Status: ${error.response.status}, Error: ${error.response.data?.message || error.message}`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`❌ ${test.name} - Server not running`);
          break;
        } else {
          console.log(`❌ ${test.name} - Error: ${error.message}`);
        }
      }
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api`);
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start it with: npm start');
    return false;
  }
}

checkServer().then(isRunning => {
  if (isRunning) {
    return testAllEndpoints();
  }
}).then(() => {
  console.log('\n🔍 Test completed. Let me create the missing tables...');
}).catch(error => {
  console.error('Test failed:', error.message);
});
