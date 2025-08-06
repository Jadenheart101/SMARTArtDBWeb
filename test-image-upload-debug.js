const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testMediaUploadWithImage() {
  try {
    console.log('🧪 Testing Media Upload with Image File\n');
    
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
    
    // Use existing image file
    const testImagePath = path.join(__dirname, 'uploads/user_anonymous/images/1752792732181_qsutbgg.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found');
      return;
    }
    
    console.log('2. Testing image upload...');
    console.log(`Using test image: ${testImagePath}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath));
    formData.append('userId', userId.toString()); // Ensure it's a string
    formData.append('customName', 'Test Upload Image');
    
    console.log(`Uploading with userId: ${userId} (as string: "${userId.toString()}")`);
    
    const uploadResponse = await axios.post('http://localhost:8080/api/media/upload', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('✅ Upload successful:', uploadResponse.data);
    
    // Test getting user's media files
    console.log('\n3. Testing media retrieval...');
    const mediaResponse = await axios.get(`http://localhost:8080/api/media/files?userId=${userId}`);
    console.log('✅ Media files retrieved:', mediaResponse.data);
    
    // Test the alternative endpoint
    console.log('\n4. Testing alternative media endpoint...');
    const altMediaResponse = await axios.get(`http://localhost:8080/api/users/${userId}/media`);
    console.log('✅ Alternative media endpoint:', altMediaResponse.data);
    
  } catch (error) {
    console.error('❌ Media upload test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testMediaUploadWithImage();
