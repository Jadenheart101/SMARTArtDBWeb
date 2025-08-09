const { executeQuery } = require('./database.js');

async function checkMediaStructure() {
    try {
        console.log('📂 Checking media file structure...');
        
        const media = await executeQuery('SELECT * FROM media_files LIMIT 1');
        
        if (media.length > 0) {
            console.log('📂 Media file structure:');
            console.log(JSON.stringify(media[0], null, 2));
            
            console.log('\n📂 Available properties:');
            Object.keys(media[0]).forEach(key => {
                console.log(`  - ${key}: ${media[0][key]}`);
            });
        } else {
            console.log('📂 No media files found in database');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkMediaStructure();
