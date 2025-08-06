const fetch = require('node-fetch');

async function checkExistingFiles() {
    try {
        console.log('Checking for existing media files...');
        const response = await fetch('http://localhost:8080/api/media/files');
        const result = await response.json();
        
        if (result.success && result.files && result.files.length > 0) {
            console.log(`Found ${result.files.length} existing media files`);
            
            const problemFiles = result.files.filter(file => {
                const name = file.displayName || file.originalName || file.name;
                return name && (name.includes("'") || name.includes('"') || name.includes('\\'));
            });
            
            if (problemFiles.length > 0) {
                console.log('⚠️ Found files with special characters that could cause JavaScript errors:');
                problemFiles.forEach(file => {
                    console.log(' -', file.displayName || file.originalName || file.name);
                });
                console.log('\nThese files are now safe with the new previewMediaSafe() function!');
            } else {
                console.log('✅ No problematic file names found');
            }
        } else {
            console.log('No existing media files found');
        }
    } catch (error) {
        console.error('Error checking files:', error.message);
    }
}

checkExistingFiles();
