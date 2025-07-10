const { testConnection, executeQuery } = require('./database');

async function checkAndCreateMediaTable() {
    console.log('🔍 Checking database connection...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Cannot connect to database. Please check your database configuration.');
        return;
    }
    
    try {
        // Check if media_files table exists
        console.log('🔍 Checking if media_files table exists...');
        const tables = await executeQuery('SHOW TABLES LIKE "media_files"');
        
        if (tables.length === 0) {
            console.log('📋 media_files table does not exist. Creating it now...');
            
            // Create the media_files table
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS media_files (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    original_name VARCHAR(255) NOT NULL,
                    file_path TEXT NOT NULL,
                    file_url VARCHAR(500) NOT NULL,
                    mime_type VARCHAR(100),
                    file_size BIGINT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_user_id (user_id),
                    INDEX idx_mime_type (mime_type),
                    INDEX idx_created_at (created_at),
                    
                    FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE
                )
            `;
            
            await executeQuery(createTableSQL);
            console.log('✅ media_files table created successfully!');
            
        } else {
            console.log('✅ media_files table already exists.');
            
            // Check table structure
            const columns = await executeQuery('DESCRIBE media_files');
            console.log('📋 Current table structure:');
            columns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
            });
        }
        
        // Test a simple query to make sure everything works
        console.log('🧪 Testing media_files table...');
        const testQuery = await executeQuery('SELECT COUNT(*) as count FROM media_files');
        console.log(`✅ Table is working. Current record count: ${testQuery[0].count}`);
        
        console.log('🎉 Database check complete! The media upload should work now.');
        
    } catch (error) {
        console.error('❌ Error checking/creating media_files table:', error);
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            console.log('💡 Note: The foreign key constraint requires the user table to exist.');
            console.log('   Make sure you have run the main database setup first.');
        }
    }
}

// Run the check
checkAndCreateMediaTable().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
