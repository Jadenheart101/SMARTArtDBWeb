const fetch = require('node-fetch');

async function checkAllMedia() {
    try {
        console.log('🔍 Checking admin endpoint for all media files...');
        
        const response = await fetch('http://localhost:8080/api/admin/media/all');
        const result = await response.json();
        
        console.log(`📊 Admin API Status: ${response.status}`);
        
        if (result.success && result.data && result.data.media) {
            console.log(`📁 Total media files in system: ${result.data.media.length}`);
            
            result.data.media.forEach((file, index) => {
                console.log(`\n${index + 1}. ID: ${file.id} | User: ${file.user_id}`);
                console.log(`   Original: ${file.original_name}`);
                console.log(`   Stored: ${file.file_name}`);
                console.log(`   Path: ${file.file_path}`);
                console.log(`   Updated: ${file.updated_at}`);
                
                if (file.id === 19) {
                    console.log('   🎯 FOUND ID 19! Status:');
                    if (file.file_name.includes('Vulkxi')) {
                        console.log('   ✅ SUCCESS: Contains Vulkxi!');
                    } else if (file.file_name.includes('qsutbgg')) {
                        console.log('   ⚠️  Still shows qsutbgg');
                    }
                }
            });
        } else {
            console.log('❌ Admin API failed or returned no files');
            console.log('Response:', result);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

checkAllMedia();
