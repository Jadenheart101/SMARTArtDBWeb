const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testMediaUpload() {
  try {
    console.log('🧪 Testing Media Upload Functionality\n');
    
    // First, create a test user
    const testUser = {
      UserName: 'media_test_user_' + Date.now(),
      Password: 'test123',
      isAdmin: 0
    };
    
    console.log('1. Creating test user...');
    const userResponse = await axios.post('http://localhost:8080/api/users', testUser);
    console.log('✅ User created:', userResponse.data.data);
    
    const userId = userResponse.data.data.UserID;
    console.log(`Using User ID: ${userId} (type: ${typeof userId})\n`);
    
    // Create a small test file
    const testFilePath = path.join(__dirname, 'test-upload-file.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for upload');
    
    console.log('2. Testing file upload...');
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('userId', userId.toString()); // Ensure it's a string
    formData.append('customName', 'Test Upload File');
    
    console.log(`Uploading with userId: ${userId} (as string: "${userId.toString()}")`);
    
    const uploadResponse = await axios.post('http://localhost:8080/api/media/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });
    
    console.log('✅ Upload successful:', uploadResponse.data);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    // Test getting user's media files
    console.log('\n3. Testing media retrieval...');
    const mediaResponse = await axios.get(`http://localhost:8080/api/media/files?userId=${userId}`);
    console.log('✅ Media files retrieved:', mediaResponse.data);
    
  } catch (error) {
    console.error('❌ Media upload test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    // Clean up test file if it exists
    const testFilePath = path.join(__dirname, 'test-upload-file.txt');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testMediaUpload();
