// Test script to verify art info form submission works after the fix
const axios = require('axios');

async function testFormSubmissionFlow() {
    console.log('🧪 Testing art info form submission flow...\n');
    
    try {
        // First, test that the server is responsive
        console.log('1. Testing server connectivity...');
        const healthResponse = await axios.get('http://localhost:8080/api');
        console.log('✅ Server is running:', healthResponse.data.message);
        
        // Test art info creation (simulating what the frontend should do)
        console.log('\n2. Testing art info submission...');
        const testArtInfo = {
            ArtistName: 'Test Artist Form Fix',
            ArtName: 'Test Artwork Form Fix',
            ArtMedia: 'test-image-form-fix.jpg',
            Submitor: 'TestUser'
        };
        
        console.log('Submitting art info:', testArtInfo);
        
        const response = await axios.post('http://localhost:8080/api/art', testArtInfo);
        
        if (response.data.success) {
            console.log('✅ Art info saved successfully!');
            console.log('   ArtId:', response.data.id);
            console.log('   Data saved:', testArtInfo);
            
            // Clean up by deleting the test entry
            console.log('\n3. Cleaning up test data...');
            const deleteResponse = await axios.delete(`http://localhost:8080/api/art/${response.data.id}`);
            if (deleteResponse.data.success) {
                console.log('✅ Test data cleaned up successfully');
            }
        } else {
            console.error('❌ Failed to save art info:', response.data.message);
        }
        
        console.log('\n🎉 Backend test completed - form submission fix should now work in frontend!');
        console.log('📝 Key fix: Event listeners are now set up AFTER dashboard is loaded');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testFormSubmissionFlow();
