const fs = require('fs');
const path = require('path');

// Test script to verify user signup is now working correctly
async function testUserSignupFixed() {
    console.log('🧪 Testing Fixed User Signup Process');
    
    try {
        // Test 1: Create a new user via API
        console.log('\nTest 1: Creating new user via API...');
        const response = await fetch('http://localhost:8080/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                UserName: `testuser_${Date.now()}`,
                Password: 'password123',
                isAdmin: 0
            })
        });
        
        const result = await response.json();
        console.log('User creation response:', result);
        
        if (result.success && result.data) {
            console.log(`✅ User created with ID: ${result.data.UserID}`);
            console.log(`✅ UserID is valid integer: ${Number.isInteger(result.data.UserID)}`);
            console.log(`✅ UserID range check: ${result.data.UserID > 0 && result.data.UserID < 2147483647}`);
            
            // Test 2: Test media upload with this new user
            console.log('\nTest 2: Testing media upload with new user...');
            
            // Create a test file
            const testFilePath = path.join(__dirname, 'test-signup-image.txt');
            fs.writeFileSync(testFilePath, 'Test file for new user upload');
            
            const formData = new FormData();
            formData.append('media', fs.createReadStream(testFilePath));
            formData.append('userId', result.data.UserID.toString());
            formData.append('customName', 'test-upload-new-user');
            
            const uploadResponse = await fetch('http://localhost:8080/api/media/upload', {
                method: 'POST',
                body: formData
            });
            
            const uploadResult = await uploadResponse.json();
            console.log('Upload result:', uploadResult);
            
            // Clean up test file
            fs.unlinkSync(testFilePath);
            
            if (uploadResult.success) {
                console.log('✅ Media upload successful with new user');
            } else {
                console.log('❌ Media upload failed:', uploadResult.message);
            }
        } else {
            console.log('❌ User creation failed:', result.message);
        }
        
        console.log('\n🎉 User signup testing completed!');
        
    } catch (error) {
        console.error('❌ Error testing user signup:', error);
    }
}

// Start the test
testUserSignupFixed();
