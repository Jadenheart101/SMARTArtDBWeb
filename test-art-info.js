const axios = require('axios');

async function testArtInfoSaving() {
    const API_BASE_URL = 'http://localhost:8080/api';
    
    console.log('🎨 Testing Art Info Saving Functionality...\n');
    
    // Test data for art info
    const testArtData = {
        ArtistName: 'Test Artist',
        ArtName: 'Test Artwork Title',
        ArtMedia: 'Oil on Canvas',
        Submitor: 'Test User',
        Date: '2025-08-07',
        artcol: 1 // Assuming media file ID 1 exists
    };
    
    try {
        console.log('📤 Sending art info to API...');
        console.log('Data:', JSON.stringify(testArtData, null, 2));
        
        const response = await axios.post(`${API_BASE_URL}/art`, testArtData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Art info saved successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        // Test retrieval
        console.log('\n📥 Testing art info retrieval...');
        const getResponse = await axios.get(`${API_BASE_URL}/art`);
        console.log('✅ Art info retrieved successfully!');
        console.log(`Found ${getResponse.data.data.length} artworks in database`);
        
        // Show the last created artwork
        const lastArtwork = getResponse.data.data[getResponse.data.data.length - 1];
        console.log('Last artwork:', JSON.stringify(lastArtwork, null, 2));
        
    } catch (error) {
        console.error('❌ Error testing art info saving:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testArtInfoSaving();
