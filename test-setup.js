// Simple test to check what's causing the error
const express = require('express');
require('dotenv').config();

console.log('🔍 Testing basic setup...');

// Test 1: Check if express works
try {
  const app = express();
  console.log('✅ Express loaded successfully');
} catch (error) {
  console.log('❌ Express error:', error.message);
  process.exit(1);
}

// Test 2: Check environment variables
console.log('🔍 Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'MISSING');
console.log('DB_NAME:', process.env.DB_NAME);

// Test 3: Check database module
try {
  const { testConnection, executeQuery } = require('./database');
  console.log('✅ Database module loaded successfully');
  
  // Test database connection
  testConnection().then(connected => {
    if (connected) {
      console.log('✅ Database connection test passed');
    } else {
      console.log('❌ Database connection test failed');
    }
    process.exit(0);
  }).catch(error => {
    console.log('❌ Database connection error:', error.message);
    process.exit(1);
  });
  
} catch (error) {
  console.log('❌ Database module error:', error.message);
  process.exit(1);
}
