// Debug script to check the exact response from media files endpoint
require('dotenv').config();

const API_BASE_URL = 'http://localhost:8080/api';

async function debugMediaResponse() {
    try {
        const response = await fetch(`${API_BASE_URL}/media/files?userId=1`);
        const result = await response.json();
        
        console.log('🔍 Media files response:', JSON.stringify(result, null, 2));
        
        if (result.success && result.files) {
            console.log('\n📁 Available files:');
            result.files.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.name} (ID: ${file.id})`);
                console.log(`     Original: ${file.originalName}`);
                console.log(`     URL: ${file.url}`);
                console.log(`     Display: ${file.displayName}`);
                console.log('');
            });
            
            // Test the filename matching logic
            const targetFilename = '1754743997357_qsutbgg.jpg';
            console.log(`🎯 Looking for filename: ${targetFilename}`);
            
            const mediaFile = result.files.find(file => 
                file.name === targetFilename || 
                file.originalName === targetFilename ||
                (file.url && file.url.includes(targetFilename))
            );
            
            if (mediaFile) {
                console.log('✅ FOUND matching file:', mediaFile);
            } else {
                console.log('❌ NO matching file found');
                console.log('Available filenames:');
                result.files.forEach(file => {
                    console.log(`  - name: "${file.name}"`);
                    console.log(`  - originalName: "${file.originalName}"`);
                    console.log(`  - url: "${file.url}"`);
                });
            }
        }
    } catch (error) {
        console.error('Error fetching media files:', error);
    }
}

debugMediaResponse();
