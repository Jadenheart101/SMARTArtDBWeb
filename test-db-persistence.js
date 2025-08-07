const { executeQuery } = require('./database.js');

async function testDatabasePersistence() {
    try {
        console.log('=== Testing Database Persistence ===');
        
        // Check current state
        console.log('\n1. Checking current database state...');
        const before = await executeQuery('SELECT COUNT(*) as count FROM media_files');
        console.log('Records before insert:', before[0].count);
        
        // Insert a record
        console.log('\n2. Inserting test record...');
        const insertResult = await executeQuery(
            'INSERT INTO media_files (user_id, file_name, original_name, file_path, file_url, mime_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [1, 'test-persistence.jpg', 'test-persistence.jpg', '/uploads/test/test-persistence.jpg', '/uploads/test/test-persistence.jpg', 'image/jpeg', 12345]
        );
        console.log('Insert result:', insertResult);
        
        // Check immediately after insert
        console.log('\n3. Checking immediately after insert...');
        const immediately = await executeQuery('SELECT COUNT(*) as count FROM media_files');
        console.log('Records immediately after insert:', immediately[0].count);
        
        // List all records
        console.log('\n4. Listing all records...');
        const allRecords = await executeQuery('SELECT * FROM media_files ORDER BY created_at DESC');
        console.table(allRecords.map(r => ({
            id: r.id,
            user_id: r.user_id,
            file_name: r.file_name,
            created_at: r.created_at
        })));
        
        // Test user-specific query
        console.log('\n5. Testing user-specific query...');
        const userRecords = await executeQuery(
            'SELECT * FROM media_files WHERE user_id = ? ORDER BY created_at DESC',
            [1]
        );
        console.log('User 1 records:', userRecords.length);
        
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testDatabasePersistence();
