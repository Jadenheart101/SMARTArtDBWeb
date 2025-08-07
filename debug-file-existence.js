const { executeQuery } = require('./database.js');
const fs = require('fs');
const path = require('path');

async function debugFileExistence() {
    try {
        console.log('Checking files in database...');
        const files = await executeQuery('SELECT * FROM media_files ORDER BY created_at DESC LIMIT 5');
        
        for (const file of files) {
            console.log('\n--- File Record ---');
            console.log('ID:', file.id);
            console.log('file_path:', file.file_path);
            console.log('file_url:', file.file_url);
            
            // Check existence with different path approaches
            const relativePath = file.file_path;
            const absolutePath = path.join(__dirname, relativePath);
            const directPath = file.file_path.replace('/', '\\'); // Windows path fix
            const absoluteDirectPath = path.join(__dirname, directPath);
            
            console.log('Relative path:', relativePath);
            console.log('Absolute path:', absolutePath);
            console.log('Direct path:', directPath);
            console.log('Absolute direct path:', absoluteDirectPath);
            
            console.log('Exists (relative):', fs.existsSync(relativePath));
            console.log('Exists (absolute):', fs.existsSync(absolutePath));
            console.log('Exists (direct):', fs.existsSync(directPath));
            console.log('Exists (absolute direct):', fs.existsSync(absoluteDirectPath));
            
            // Check what's actually in the uploads directory
            const uploadsDir = path.join(__dirname, 'uploads', 'user_anonymous', 'images');
            console.log('Uploads directory contents:');
            if (fs.existsSync(uploadsDir)) {
                const files = fs.readdirSync(uploadsDir);
                console.log(files);
            } else {
                console.log('Uploads directory does not exist');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Debug error:', error);
        process.exit(1);
    }
}

debugFileExistence();
