const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function comprehensiveMediaTest() {
  try {
    console.log('🧪 Comprehensive Media Upload Testing\n');
    
    const testImagePath = path.join(__dirname, 'uploads/user_anonymous/images/1752792732181_qsutbgg.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found');
      return;
    }
    
    // Test 1: Normal user upload
    console.log('Test 1: Normal user upload');
    const testUser1 = {
      UserName: 'normal_user_' + Date.now(),
      Password: 'test123',
      isAdmin: 0
    };
    
    const userResponse1 = await axios.post('http://localhost:8080/api/users', testUser1);
    const userId1 = userResponse1.data.data.UserID;
    console.log(`Created user ${userId1}`);
    
    const formData1 = new FormData();
    formData1.append('file', fs.createReadStream(testImagePath));
    formData1.append('userId', userId1.toString());
    formData1.append('customName', 'Normal User Upload');
    
    const upload1 = await axios.post('http://localhost:8080/api/media/upload', formData1, {
      headers: { ...formData1.getHeaders() }
    });
    console.log('✅ Normal user upload successful');
    
    // Test 2: Upload without custom name
    console.log('\nTest 2: Upload without custom name');
    const formData2 = new FormData();
    formData2.append('file', fs.createReadStream(testImagePath));
    formData2.append('userId', userId1.toString());
    
    const upload2 = await axios.post('http://localhost:8080/api/media/upload', formData2, {
      headers: { ...formData2.getHeaders() }
    });
    console.log('✅ Upload without custom name successful');
    
    // Test 3: Check user's media files
    console.log('\nTest 3: Check user media files');
    const mediaResponse = await axios.get(`http://localhost:8080/api/media/files?userId=${userId1}`);
    console.log(`✅ User has ${mediaResponse.data.files.length} media files`);
    
    // Test 4: Test file deletion
    console.log('\nTest 4: Test file deletion');
    const fileToDelete = mediaResponse.data.files[0];
    
    const deleteResponse = await axios.delete(`http://localhost:8080/api/media/file/${fileToDelete.id}`, {
      data: { userId: userId1 }
    });
    console.log('✅ File deletion successful');
    
    // Test 5: Test with different user ID types
    console.log('\nTest 5: Test with string user ID');
    const formData3 = new FormData();
    formData3.append('file', fs.createReadStream(testImagePath));
    formData3.append('userId', '1'); // String user ID
    formData3.append('customName', 'String User ID Test');
    
    const upload3 = await axios.post('http://localhost:8080/api/media/upload', formData3, {
      headers: { ...formData3.getHeaders() }
    });
    console.log('✅ String user ID upload successful');
    
    // Test 6: Error case - missing userId
    console.log('\nTest 6: Missing userId (should fail)');
    try {
      const formData4 = new FormData();
      formData4.append('file', fs.createReadStream(testImagePath));
      // No userId provided
      
      await axios.post('http://localhost:8080/api/media/upload', formData4, {
        headers: { ...formData4.getHeaders() }
      });
      console.log('❌ Should have failed but succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected upload without userId');
      } else {
        console.log('❌ Failed with unexpected error:', error.message);
      }
    }
    
    console.log('\n🎉 All media upload tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Comprehensive media test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

comprehensiveMediaTest();
