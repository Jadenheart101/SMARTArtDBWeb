const { executeQuery } = require('./database.js');

async function checkMediaFiles() {
    try {
        console.log('Checking media_files table...');
        const result = await executeQuery('SELECT * FROM media_files ORDER BY created_at DESC LIMIT 10');
        console.log('Media files found:', result.length);
        if (result.length > 0) {
            console.table(result);
        } else {
            console.log('No media files found in database');
        }
        
        // Also check total count
        const countResult = await executeQuery('SELECT COUNT(*) as total FROM media_files');
        console.log('Total media files in database:', countResult[0].total);
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking media files:', error);
        process.exit(1);
    }
}

checkMediaFiles();
