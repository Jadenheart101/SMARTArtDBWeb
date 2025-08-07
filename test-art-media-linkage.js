// Test script to save art info properly linked to a media file
const axios = require('axios');

async function testArtInfoLinkage() {
    console.log('🧪 Testing art info linkage to media files...\n');
    
    try {
        // First, let's save art info for the image we know exists: 1754449687142_qsutbgg.jpg
        const testArtInfo = {
            ArtistName: 'Test Artist For Media Link',
            ArtName: 'Test Artwork For Media Link',
            ArtMedia: 'Digital Photography', // This should be the medium, not filename
            Submitor: 'Test Submitter',
            Date: '2025-08-07',
            artcol: '1754449687142_qsutbgg.jpg' // This should link to the media filename
        };
        
        console.log('1. Creating art info for media file 1754449687142_qsutbgg.jpg');
        console.log('Data:', testArtInfo);
        
        const saveResponse = await axios.post('http://localhost:8080/api/art', testArtInfo);
        
        if (saveResponse.data.success) {
            console.log('✅ Art info saved successfully!');
            console.log('ArtId:', saveResponse.data.id);
            
            // Now test the media lookup
            console.log('\n2. Testing media lookup...');
            const lookupResponse = await axios.get('http://localhost:8080/api/art/media/1754449687142_qsutbgg.jpg');
            
            if (lookupResponse.data.success) {
                console.log('✅ Art info found via media lookup!');
                console.log('Found data:', lookupResponse.data.data);
            } else {
                console.log('❌ Art info not found via media lookup');
            }
        } else {
            console.error('❌ Failed to save art info:', saveResponse.data.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testArtInfoLinkage();
