const { executeQuery, testConnection } = require('./database');
require('dotenv').config();

async function inspectDatabase() {
  console.log('🔍 Inspecting existing Railway database...\n');
  
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ Cannot connect to database. Please check your .env file.');
      return;
    }

    // Get all tables
    console.log('📋 Tables in database:');
    const tables = await executeQuery('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('   No tables found in database.');
      return;
    }

    // Get the table name key (it varies by database)
    const tableKey = Object.keys(tables[0])[0];
    
    for (const table of tables) {
      const tableName = table[tableKey];
      console.log(`\n📄 Table: ${tableName}`);
      
      // Get table structure
      try {
        const columns = await executeQuery(`DESCRIBE ${tableName}`);
        console.log('   Columns:');
        columns.forEach(col => {
          console.log(`     - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? col.Key : ''}`);
        });
        
        // Get row count
        const count = await executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   Rows: ${count[0].count}`);
        
        // Show sample data (first 3 rows)
        if (count[0].count > 0) {
          const sample = await executeQuery(`SELECT * FROM ${tableName} LIMIT 3`);
          console.log('   Sample data:');
          sample.forEach((row, index) => {
            console.log(`     Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      } catch (error) {
        console.log(`   Error inspecting table: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error.message);
  }
  
  process.exit(0);
}

inspectDatabase();
