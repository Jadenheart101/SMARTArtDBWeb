const axios = require('axios');

async function testArtAPI() {
  try {
    console.log('Testing Art API directly...');
    
    const artData = {
      ArtistName: 'Direct Test Artist',
      ArtName: 'Direct Test Artwork',
      Submitor: 'Direct Test Submitter',
      ArtMedia: 'Digital'
    };
    
    console.log('Sending request with data:', artData);
    
    const response = await axios.post('http://localhost:8080/api/art', artData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testArtAPI();
