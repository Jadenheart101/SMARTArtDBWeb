const mysql = require('mysql2/promise');
require('dotenv').config();

async function showDatabaseTables() {
  console.log('🔍 Inspecting Azure MySQL Database Tables...\n');
  
  try {
    // Connect to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000
    });

    console.log('✅ Connected to Azure MySQL successfully');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`🌐 Host: ${process.env.DB_HOST}\n`);

    // Get all tables in the database
    console.log('📋 Tables in database:');
    const [tables] = await connection.execute('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('   No tables found in database.');
      console.log('   💡 You may need to run database setup scripts to create tables.');
      await connection.end();
      return;
    }

    const tableKey = Object.keys(tables[0])[0]; // Get the column name for table names
    
    for (const table of tables) {
      const tableName = table[tableKey];
      console.log(`\n📄 Table: ${tableName}`);
      console.log('─'.repeat(50));
      
      try {
        // Get table structure
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log('   Columns:');
        columns.forEach(col => {
          const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
          const key = col.Key ? `[${col.Key}]` : '';
          const defaultVal = col.Default !== null ? `DEFAULT: ${col.Default}` : '';
          const extra = col.Extra ? `${col.Extra}` : '';
          
          console.log(`     - ${col.Field.padEnd(20)} ${col.Type.padEnd(15)} ${nullable.padEnd(8)} ${key} ${defaultVal} ${extra}`);
        });
        
        // Get row count
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   📊 Total rows: ${countResult[0].count}`);
        
        // Show sample data (first 3 rows) if there are any rows
        if (countResult[0].count > 0) {
          const [sampleData] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
          console.log('   📝 Sample data:');
          sampleData.forEach((row, index) => {
            console.log(`     Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        } else {
          console.log('   📝 No data in table');
        }
        
      } catch (error) {
        console.log(`   ❌ Error inspecting table: ${error.message}`);
      }
    }
    
    // Show database size information
    console.log('\n📊 Database Information:');
    console.log('─'.repeat(50));
    
    try {
      const [dbInfo] = await connection.execute(`
        SELECT 
          table_name as 'Table',
          round(((data_length + index_length) / 1024 / 1024), 2) as 'Size (MB)',
          table_rows as 'Rows'
        FROM information_schema.tables 
        WHERE table_schema = ?
        ORDER BY (data_length + index_length) DESC
      `, [process.env.DB_NAME]);
      
      console.log('   Table sizes:');
      dbInfo.forEach(info => {
        console.log(`     ${info.Table.padEnd(20)} ${String(info['Size (MB)']).padEnd(10)} MB   ${info.Rows} rows`);
      });
      
    } catch (error) {
      console.log('   Could not retrieve size information');
    }
    
    await connection.end();
    console.log('\n✅ Database inspection completed');
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

// Run the inspection
showDatabaseTables().then(() => {
  console.log('\n🎯 Database inspection finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Inspection failed:', error);
  process.exit(1);
});
