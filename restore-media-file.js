// Script to restore the missing media file in the database
const mysql = require('mysql2/promise');
require('dotenv').config();

async function restoreMediaFile() {
    console.log('🔧 Restoring missing media file...');
    
    // Use the same database configuration as the main app
    const dbConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_HOST && process.env.DB_HOST.includes('.mysql.database.azure.com') ? {
            rejectUnauthorized: false
        } : false,
        connectTimeout: 60000
    };
    
    const connection = await mysql.createConnection(dbConfig);

    try {
        // Check current media files
        const [currentFiles] = await connection.execute('SELECT * FROM media_files ORDER BY id');
        console.log('📋 Current media files in database:');
        currentFiles.forEach(file => {
            console.log(`  ID: ${file.id}, File: ${file.file_name}`);
        });

        // Check if file ID 4 exists
        const [file4] = await connection.execute('SELECT * FROM media_files WHERE id = 4');
        
        if (file4.length === 0) {
            console.log('❌ File ID 4 is missing from database. Restoring...');
            
            // Insert the missing file record
            await connection.execute(`
                INSERT INTO media_files (id, file_name, original_name, file_path, file_url, file_size, mime_type, user_id, created_at, updated_at)
                VALUES (4, '1754743997357_qsutbgg.jpg', '1754743997357_qsutbgg.jpg', '/uploads/user_anonymous/images/1754743997357_qsutbgg.jpg', '/uploads/user_anonymous/images/1754743997357_qsutbgg.jpg', 152732, 'image/jpeg', 1, NOW(), NOW())
            `);
            
            console.log('✅ File ID 4 restored successfully!');
        } else {
            console.log('✅ File ID 4 already exists in database');
        }

        // Verify the file is now there
        const [verifyFiles] = await connection.execute('SELECT * FROM media_files ORDER BY id');
        console.log('📋 Media files after restoration:');
        verifyFiles.forEach(file => {
            console.log(`  ID: ${file.id}, File: ${file.file_name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

restoreMediaFile();
