const fs = require('fs');
const http = require('http');
const FormData = require('form-data');

async function testMediaUpload() {
    console.log('🧪 Testing media upload functionality...');
    
    try {
        // Create a simple test image file (1x1 pixel PNG)
        const testImageData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x25, 0xDB, 0x56, 0xCA, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        const testFileName = 'test-upload.png';
        fs.writeFileSync(testFileName, testImageData);
        
        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFileName));
        formData.append('userId', '1'); // Test user ID
        
        // Make upload request using http module
        console.log('📤 Uploading test file...');
        
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/media/upload',
            method: 'POST',
            headers: formData.getHeaders()
        };
        
        const uploadPromise = new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Invalid JSON response: ' + data));
                    }
                });
            });
            
            req.on('error', reject);
            formData.pipe(req);
        });
        
        const result = await uploadPromise;
        
        if (result.success) {
            console.log('✅ Upload successful!');
            console.log('📁 File info:', result.file);
            
            // Test file listing
            console.log('📋 Testing file listing...');
            const listOptions = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/media/files?userId=1',
                method: 'GET'
            };
            
            const listPromise = new Promise((resolve, reject) => {
                const req = http.request(listOptions, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (e) {
                            reject(new Error('Invalid JSON response: ' + data));
                        }
                    });
                });
                req.on('error', reject);
                req.end();
            });
            
            const listResult = await listPromise;
            
            if (listResult.success) {
                console.log('✅ File listing successful!');
                console.log(`📊 Found ${listResult.files.length} files`);
                
                if (listResult.files.length > 0) {
                    console.log('📄 First file:', listResult.files[0]);
                }
            } else {
                console.log('❌ File listing failed:', listResult.message);
            }
            
        } else {
            console.log('❌ Upload failed:', result.message);
        }
        
        // Clean up test file
        if (fs.existsSync(testFileName)) {
            fs.unlinkSync(testFileName);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testMediaUpload().then(() => {
    console.log('🎉 Test complete!');
    process.exit(0);
}).catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
});
