const axios = require('axios');

async function testCardMediaWorkflow() {
    try {
        console.log('📄 Testing Card Media Attachment Workflow...\n');
        
        // Step 1: Check if we have media files available
        console.log('1. Checking available media files...');
        const mediaResponse = await axios.get('http://localhost:8080/api/media/files?userId=1');
        console.log('   ✅ Media files found:', mediaResponse.data.files.length);
        
        if (mediaResponse.data.files.length === 0) {
            console.log('   ❌ No media files available for testing');
            return;
        }
        
        const firstMedia = mediaResponse.data.files[0];
        console.log('   📂 Using media:', firstMedia.originalName, '(ID:', firstMedia.id + ')');
        
        // Step 2: Check if we have cards available
        console.log('\n2. Checking available cards...');
        const cardsResponse = await axios.get('http://localhost:8080/api/cards');
        console.log('   ✅ Cards found:', cardsResponse.data.data.length);
        
        if (cardsResponse.data.data.length === 0) {
            console.log('   ❌ No cards available for testing');
            return;
        }
        
        const firstCard = cardsResponse.data.data[0];
        console.log('   📄 Using card:', firstCard.Title || firstCard.card_title, '(ID:', firstCard.CardID || firstCard.id + ')');
        
        // Step 3: Test attaching media to card
        console.log('\n3. Testing media attachment...');
        const cardId = firstCard.CardID || firstCard.id;
        const mediaId = firstMedia.id;
        
        console.log('   📤 Sending POST request to attach media...');
        console.log('   📄 Card ID:', cardId);
        console.log('   📂 Media ID:', mediaId);
        
        const attachResponse = await axios.post(`http://localhost:8080/api/cards/${cardId}/media`, {
            mediaId: mediaId
        });
        
        console.log('   ✅ Attachment response:', attachResponse.data);
        
        // Step 4: Verify the attachment
        console.log('\n4. Verifying attachment...');
        const verifyResponse = await axios.get(`http://localhost:8080/api/cards/${cardId}/media`);
        console.log('   ✅ Attached media:', verifyResponse.data.data.length, 'files');
        
        if (verifyResponse.data.data.length > 0) {
            console.log('   📂 Attached media details:');
            verifyResponse.data.data.forEach((media, index) => {
                console.log(`     ${index + 1}. ${media.original_name} (Media ID: ${media.id})`);
            });
        }
        
        console.log('\n✅ Card media attachment test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        } else {
            console.error('   Error:', error.message);
        }
    }
}

testCardMediaWorkflow();
