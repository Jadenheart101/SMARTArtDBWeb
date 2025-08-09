const axios = require('axios');

async function testMediaFilesEndpoint() {
    try {
        console.log('📂 Testing media files endpoint...');
        
        const response = await axios.get('http://localhost:8080/api/media/files?userId=1');
        
        console.log('📂 Response status:', response.status);
        console.log('📂 Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success && response.data.files) {
            console.log('📂 Files found:', response.data.files.length);
            response.data.files.forEach((file, index) => {
                console.log(`📂 File ${index + 1}:`);
                console.log(`   ID: ${file.id}`);
                console.log(`   URL: ${file.url}`);
                console.log(`   Original Name: ${file.originalName}`);
                console.log(`   File URL: ${file.file_url || 'N/A'}`);
                console.log(`   Original Name Raw: ${file.original_name || 'N/A'}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

testMediaFilesEndpoint();
