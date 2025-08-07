const axios = require('axios');

async function testArtSaving() {
    try {
        console.log('🧪 Testing art info saving...');
        const testData = {
            ArtistName: 'Test Artist Button',
            ArtName: 'Test Button Artwork',
            ArtMedia: 'Digital',
            Submitor: 'Button Tester',
            Date: '2025-08-07',
            artcol: 2
        };
        
        console.log('📤 Sending data:', testData);
        const response = await axios.post('http://localhost:8080/api/art', testData);
        console.log('✅ Art info saved successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testArtSaving();
