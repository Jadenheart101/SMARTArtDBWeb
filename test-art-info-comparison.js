// Test script to compare what both art info functions find
const axios = require('axios');

async function compareBothArtInfoLookups() {
    console.log('🔍 Comparing art info lookups for the same media file...\n');
    
    const filename = '1754449687142_qsutbgg.jpg';
    
    try {
        // Test the API endpoint directly (same one both functions use)
        console.log('1. Direct API test for filename:', filename);
        const directResponse = await axios.get(`http://localhost:8080/api/art/media/${filename}`);
        
        if (directResponse.data.success) {
            console.log('✅ Direct API call found art info:');
            console.log('   Artist:', directResponse.data.data.ArtistName);
            console.log('   Title:', directResponse.data.data.ArtName);
            console.log('   Medium:', directResponse.data.data.ArtMedia);
            console.log('   Submitter:', directResponse.data.data.Submitor);
            console.log('   Date:', directResponse.data.data.Date);
            console.log('   ArtId:', directResponse.data.data.ArtId);
            console.log('   artcol:', directResponse.data.data.artcol);
        } else {
            console.log('❌ Direct API call failed:', directResponse.data.message);
        }
        
        // Now test what happens if we try different values
        console.log('\n2. Testing different possible media ID values...');
        
        const testValues = [
            filename,                    // The actual filename
            filename.split('.')[0],      // Filename without extension
            '7',                         // Image ID from the project
            '/uploads/user_anonymous/images/' + filename  // Full path
        ];
        
        for (const testValue of testValues) {
            try {
                console.log(`\nTesting with value: "${testValue}"`);
                const testResponse = await axios.get(`http://localhost:8080/api/art/media/${encodeURIComponent(testValue)}`);
                
                if (testResponse.data.success) {
                    console.log(`✅ Found art info with "${testValue}":`, testResponse.data.data.ArtistName);
                } else {
                    console.log(`❌ No art info found with "${testValue}"`);
                }
            } catch (error) {
                console.log(`❌ Error with "${testValue}":`, error.response?.status || error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

compareBothArtInfoLookups();
