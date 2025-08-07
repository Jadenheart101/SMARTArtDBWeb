const { executeQuery } = require('./database.js');
const fs = require('fs');
const path = require('path');

async function testAdminLogic() {
    try {
        console.log('Testing exact admin API logic...');
        
        const files = await executeQuery(`
            SELECT 
                mf.*,
                u.UserName as owner_name
            FROM media_files mf
            LEFT JOIN user u ON mf.user_id = u.UserID
            ORDER BY mf.created_at DESC
        `);
        
        console.log('Query returned', files.length, 'files');
        
        const processedFiles = [];
        for (const file of files) {
            console.log('\n--- Processing file ---');
            console.log('ID:', file.id);
            console.log('file_path:', file.file_path);
            console.log('file_url:', file.file_url);
            
            // Check if file still exists on disk (convert relative path to absolute path)
            const absolutePath = file.file_path ? path.join(__dirname, file.file_path) : null;
            const fileExists = !file.file_path || fs.existsSync(absolutePath);
            
            console.log('absolutePath:', absolutePath);
            console.log('fileExists:', fileExists);
            
            if (fileExists) {
                console.log('File exists, adding to processedFiles');
                processedFiles.push({
                    id: file.id,
                    file_name: file.file_name,
                    original_name: file.original_name,
                    display_name: file.displayName,
                    file_path: file.file_url,
                    file_size: file.file_size,
                    mime_type: file.mime_type,
                    upload_date: file.created_at,
                    user_id: file.user_id,
                    username: file.owner_name || 'Unknown User',
                    filePath: file.file_path
                });
            } else {
                console.log('File does not exist, skipping');
            }
        }
        
        console.log('\nFinal processedFiles count:', processedFiles.length);
        
        if (processedFiles.length > 0) {
            console.log('Sample processed file:');
            console.log(JSON.stringify(processedFiles[0], null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testAdminLogic();
