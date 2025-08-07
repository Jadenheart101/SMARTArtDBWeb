const { executeQuery } = require('./database.js');

async function testMediaFilesQuery() {
    try {
        console.log('Testing media files query...');
        
        // First check all media files
        const allFiles = await executeQuery('SELECT * FROM media_files ORDER BY created_at DESC');
        console.log('All media files:', allFiles.length);
        if (allFiles.length > 0) {
            console.table(allFiles.map(f => ({
                id: f.id,
                user_id: f.user_id,
                file_name: f.file_name,
                created_at: f.created_at
            })));
        }
        
        // Then check files for user 1
        const userFiles = await executeQuery(
            'SELECT * FROM media_files WHERE user_id = ? ORDER BY created_at DESC',
            [1]
        );
        console.log('Files for user 1:', userFiles.length);
        if (userFiles.length > 0) {
            console.table(userFiles.map(f => ({
                id: f.id,
                user_id: f.user_id,
                file_name: f.file_name,
                file_path: f.file_path,
                created_at: f.created_at
            })));
        }
        
        // Test with string '1' instead of number 1
        const userFilesString = await executeQuery(
            'SELECT * FROM media_files WHERE user_id = ? ORDER BY created_at DESC',
            ['1']
        );
        console.log('Files for user "1" (string):', userFilesString.length);
        
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testMediaFilesQuery();
