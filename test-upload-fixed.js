const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
    try {
        // Use an existing image file for testing
        const testImagePath = './uploads/user_anonymous/images/1754606414062_qsutbgg.jpg';
        
        if (!fs.existsSync(testImagePath)) {
            console.log('Test image not found, skipping upload test');
            return;
        }
        
        const form = new FormData();
        form.append('file', fs.createReadStream(testImagePath), {
            filename: 'test-upload.jpg',
            contentType: 'image/jpeg'
        });
        form.append('userId', '1');
        
        console.log('Uploading test file...');
        const response = await fetch('http://localhost:8080/api/media/upload', {
            method: 'POST',
            body: form
        });
        
        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.log('Response is not JSON, raw text:', responseText);
            return;
        }
        console.log('Upload result:', result);
        
        // Now check the database
        const { executeQuery } = require('./database.js');
        const mediaFiles = await executeQuery('SELECT * FROM media_files ORDER BY created_at DESC LIMIT 5');
        console.log('Media files in database:', mediaFiles);
        
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testUpload();
