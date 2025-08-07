const axios = require('axios');

async function checkMedia() {
    try {
        // First check if there are any media files for user ID 1
        const response = await axios.get('http://localhost:8080/api/media/files?userId=1');
        console.log('Available media files for user 1:');
        if (response.data.data && response.data.data.length > 0) {
            response.data.data.forEach(file => {
                console.log(`ID: ${file.id}, Name: ${file.filename}, Type: ${file.file_type}`);
            });
        } else {
            console.log('No media files found for user 1');
        }
        
        // Also check for existing art info
        console.log('\nChecking existing art info...');
        const artResponse = await axios.get('http://localhost:8080/api/art');
        if (artResponse.data.data && artResponse.data.data.length > 0) {
            console.log('Existing art info:');
            artResponse.data.data.forEach(art => {
                console.log(`Art ID: ${art.ArtId}, Name: ${art.ArtName}, Artist: ${art.ArtistName}, Media File: ${art.artcol}`);
            });
        } else {
            console.log('No art info found');
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

checkMedia();
