const axios = require('axios');

async function testArtInfoWorkflow() {
    const API_BASE_URL = 'http://localhost:8080/api';
    
    console.log('🧪 Testing Art Info Workflow...\n');
    
    // Step 1: Check if there's existing art info for media file 1
    console.log('1️⃣ Checking for existing art info for media file 1...');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/art/media/1`);
        console.log('✅ Found existing art info:');
        console.log(JSON.stringify(response.data.data, null, 2));
        
        // Step 2: Update the existing art info
        console.log('\n2️⃣ Updating existing art info...');
        const updatedData = {
            ArtistName: 'Updated Artist Name',
            ArtName: 'Updated Artwork Title',
            ArtMedia: 'Updated Medium',
            Submitor: 'Test Updater',
            Date: '2025-08-07',
            artcol: 1
        };
        
        const updateResponse = await axios.put(
            `${API_BASE_URL}/art/${response.data.data.ArtId}`, 
            updatedData
        );
        
        console.log('✅ Updated successfully:');
        console.log(JSON.stringify(updateResponse.data.data, null, 2));
        
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log('ℹ️ No existing art info found for media file 1');
            
            // Step 2: Create new art info
            console.log('\n2️⃣ Creating new art info...');
            const newData = {
                ArtistName: 'New Artist',
                ArtName: 'New Artwork Title',
                ArtMedia: 'New Medium',
                Submitor: 'Test Creator',
                Date: '2025-08-07',
                artcol: 1
            };
            
            const createResponse = await axios.post(`${API_BASE_URL}/art`, newData);
            console.log('✅ Created successfully:');
            console.log(JSON.stringify(createResponse.data.data, null, 2));
            
        } else {
            console.error('❌ Error:', error.response ? error.response.data : error.message);
        }
    }
    
    // Step 3: Verify the final state
    console.log('\n3️⃣ Verifying final state...');
    try {
        const finalResponse = await axios.get(`${API_BASE_URL}/art/media/1`);
        console.log('✅ Final art info for media file 1:');
        console.log(JSON.stringify(finalResponse.data.data, null, 2));
    } catch (error) {
        console.error('❌ Error verifying:', error.response ? error.response.data : error.message);
    }
}

testArtInfoWorkflow();
