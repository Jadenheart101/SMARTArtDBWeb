const { testConnection, executeQuery } = require('./database');

async function fixMediaTableStructure() {
    console.log('🔍 Checking current media_files table structure...');
    
    try {
        // Get current table structure
        const columns = await executeQuery('DESCRIBE media_files');
        console.log('📋 Current columns:');
        const columnNames = [];
        columns.forEach(col => {
            columnNames.push(col.Field);
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
        });
        
        // Check if we need to add missing columns for local file storage
        const requiredColumns = [
            { name: 'file_path', type: 'TEXT', nullable: true },
            { name: 'file_url', type: 'VARCHAR(500)', nullable: true }
        ];
        
        for (const col of requiredColumns) {
            if (!columnNames.includes(col.name)) {
                console.log(`➕ Adding missing column: ${col.name}`);
                const addColumnSQL = `ALTER TABLE media_files ADD COLUMN ${col.name} ${col.type} ${col.nullable ? 'NULL' : 'NOT NULL'}`;
                await executeQuery(addColumnSQL);
                console.log(`✅ Added column: ${col.name}`);
            } else {
                console.log(`✅ Column ${col.name} already exists`);
            }
        }
        
        // Test insert with actual structure
        console.log('🧪 Testing insert query...');
        
        // First, let's see what columns we have now
        const updatedColumns = await executeQuery('DESCRIBE media_files');
        const finalColumnNames = updatedColumns.map(col => col.Field);
        console.log('📋 Final column names:', finalColumnNames);
        
        // Test the exact insert query used by the API
        const testInsertSQL = 'INSERT INTO media_files (user_id, file_name, original_name, file_path, file_url, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)';
        console.log('🧪 Testing insert SQL:', testInsertSQL);
        
        // Just validate the SQL without actually inserting
        try {
            await executeQuery('EXPLAIN ' + testInsertSQL);
            console.log('✅ Insert query is valid');
        } catch (error) {
            console.error('❌ Insert query has issues:', error.message);
            
            // Let's try to fix the columns
            if (error.message.includes("Unknown column")) {
                console.log('🔧 Attempting to fix column mismatch...');
                
                // Show what the API expects vs what we have
                const expectedColumns = ['user_id', 'file_name', 'original_name', 'file_path', 'file_url', 'mime_type', 'file_size'];
                console.log('Expected columns:', expectedColumns);
                console.log('Actual columns:', finalColumnNames);
                
                // Suggest the correct insert statement
                const availableColumns = expectedColumns.filter(col => finalColumnNames.includes(col));
                console.log('Available expected columns:', availableColumns);
                
                if (finalColumnNames.includes('file_id') && !finalColumnNames.includes('file_path')) {
                    console.log('💡 Suggestion: The table seems to be set up for OneDrive storage, but the API is trying to use local storage.');
                    console.log('💡 You may need to use a different insert query or update the table structure.');
                }
            }
        }
        
        console.log('🎉 Media table structure check complete!');
        
    } catch (error) {
        console.error('❌ Error checking table structure:', error);
    }
}

// Run the check
fixMediaTableStructure().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
