const fetch = require('node-fetch');

async function testGalleryRefresh() {
    try {
        console.log('🔍 Testing gallery API to see current media files...');
        
        const response = await fetch('http://localhost:8080/api/media/files?userId=1');
        const result = await response.json();
        
        console.log(`📊 Gallery API Status: ${response.status}`);
        
        if (result.success && result.files) {
            console.log(`📁 Found ${result.files.length} media files:`);
            
            result.files.forEach((file, index) => {
                console.log(`\n${index + 1}. File ID: ${file.id}`);
                console.log(`   Original: ${file.originalName}`);
                console.log(`   Stored: ${file.name}`);
                console.log(`   URL: ${file.url}`);
                console.log(`   Updated: ${file.updatedAt}`);
                
                if (file.id === 19) {
                    console.log('   🎯 THIS IS ID 19 (our test file):');
                    if (file.name && file.name.includes('Vulkxi')) {
                        console.log('   ✅ SUCCESS: Shows Vulkxi filename!');
                    } else if (file.name && file.name.includes('qsutbgg')) {
                        console.log('   ❌ PROBLEM: Still shows qsutbgg filename');
                    }
                }
            });
        } else {
            console.log('❌ Gallery API failed or returned no files');
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

testGalleryRefresh();
