const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testCompleteFlow() {
    try {
        console.log('🔄 Complete test: Upload qsutbgg → Replace with Vulkxi → Check gallery');
        
        // Step 1: Upload qsutbgg.jpg
        console.log('\n📤 Step 1: Uploading qsutbgg.jpg...');
        const uploadForm = new FormData();
        uploadForm.append('file', fs.createReadStream('uploads/user_anonymous/images/1754608602303_qsutbgg.jpg'));
        uploadForm.append('userId', '1');
        
        const uploadResponse = await fetch('http://localhost:8080/api/media/upload', {
            method: 'POST',
            body: uploadForm
        });
        
        const uploadResult = await uploadResponse.json();
        console.log(`📊 Upload Status: ${uploadResponse.status}`);
        
        if (!uploadResult.success) {
            console.log('❌ Upload failed:', uploadResult);
            return;
        }
        
        const uploadedId = uploadResult.file.id;
        console.log(`✅ qsutbgg.jpg uploaded with ID: ${uploadedId}`);
        
        // Step 2: Replace with Vulkxi.png
        console.log(`\n🔄 Step 2: Replacing ID ${uploadedId} with Vulkxi.png...`);
        const replaceForm = new FormData();
        replaceForm.append('file', fs.createReadStream('uploads/user_anonymous/images/1754607302361_Vulkxi.png'));
        replaceForm.append('userId', '1');
        
        const replaceResponse = await fetch(`http://localhost:8080/api/media/${uploadedId}/replace`, {
            method: 'POST',
            body: replaceForm
        });
        
        const replaceResult = await replaceResponse.json();
        console.log(`📊 Replace Status: ${replaceResponse.status}`);
        
        if (replaceResult.success) {
            console.log('✅ Replacement successful!');
            console.log(`   New filename: ${replaceResult.data.fileName}`);
        } else {
            console.log('❌ Replacement failed:', replaceResult);
            return;
        }
        
        // Step 3: Check gallery to see if it shows updated file
        console.log('\n📁 Step 3: Checking gallery for updated file...');
        const galleryResponse = await fetch('http://localhost:8080/api/media/files?userId=1');
        const galleryResult = await galleryResponse.json();
        
        console.log(`📊 Gallery Status: ${galleryResponse.status}`);
        
        if (galleryResult.success && galleryResult.files) {
            console.log(`📁 Gallery shows ${galleryResult.files.length} files:`);
            
            galleryResult.files.forEach((file, index) => {
                console.log(`\n${index + 1}. ID: ${file.id}`);
                console.log(`   Name: ${file.name}`);
                console.log(`   Original: ${file.originalName}`);
                console.log(`   URL: ${file.url}`);
                
                if (file.id == uploadedId) {
                    console.log('   🎯 THIS IS OUR TEST FILE:');
                    if (file.name && file.name.includes('Vulkxi')) {
                        console.log('   ✅ SUCCESS: Gallery shows Vulkxi filename!');
                        console.log('   🎉 COMPLETE SUCCESS: qsutbgg → Vulkxi replacement working!');
                    } else if (file.name && file.name.includes('qsutbgg')) {
                        console.log('   ❌ PROBLEM: Gallery still shows qsutbgg filename');
                    } else {
                        console.log(`   ⚠️  Unexpected filename: ${file.name}`);
                    }
                }
            });
        } else {
            console.log('❌ Gallery check failed:', galleryResult);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

testCompleteFlow();
