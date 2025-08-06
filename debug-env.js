const fs = require('fs');
const path = require('path');

// Read the .env file directly
const envPath = path.join(__dirname, '.env');
console.log('Reading .env file from:', envPath);

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n📄 .env file content:');
  console.log('==================');
  console.log(envContent);
  console.log('==================\n');
} catch (error) {
  console.error('Error reading .env file:', error.message);
}

// Now load with dotenv
require('dotenv').config();

console.log('🔍 Environment variables loaded by dotenv:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
