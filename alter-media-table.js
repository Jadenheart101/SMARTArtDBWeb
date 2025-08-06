const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterMediaFilesTable() {
  console.log('🔧 Altering media_files table to match application requirements...\n');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000
    });

    console.log('✅ Connected to Azure MySQL database\n');
    
    // Add missing columns
    const alterations = [
      {
        name: 'Add user_id column',
        sql: 'ALTER TABLE media_files ADD COLUMN user_id INT AFTER id'
      },
      {
        name: 'Add file_name column (rename filename)',
        sql: 'ALTER TABLE media_files ADD COLUMN file_name VARCHAR(255) NOT NULL AFTER user_id'
      },
      {
        name: 'Add displayName column',
        sql: 'ALTER TABLE media_files ADD COLUMN displayName VARCHAR(255) AFTER original_name'
      },
      {
        name: 'Add file_id column',
        sql: 'ALTER TABLE media_files ADD COLUMN file_id VARCHAR(255) AFTER displayName'
      },
      {
        name: 'Add file_url column',
        sql: 'ALTER TABLE media_files ADD COLUMN file_url VARCHAR(500) AFTER file_path'
      },
      {
        name: 'Add created_at column',
        sql: 'ALTER TABLE media_files ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER file_size'
      },
      {
        name: 'Add updated_at column',
        sql: 'ALTER TABLE media_files ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
      }
    ];
    
    for (const alteration of alterations) {
      try {
        console.log(`🔧 ${alteration.name}...`);
        await connection.execute(alteration.sql);
        console.log(`✅ ${alteration.name} - completed`);
      } catch (error) {
        if (error.message.includes('Duplicate column name') || error.message.includes('already exists')) {
          console.log(`ℹ️  ${alteration.name} - column already exists`);
        } else {
          console.log(`❌ ${alteration.name} - error: ${error.message}`);
        }
      }
    }
    
    // Copy data from filename to file_name if needed
    console.log('\n📋 Copying data from filename to file_name...');
    try {
      await connection.execute('UPDATE media_files SET file_name = filename WHERE file_name IS NULL OR file_name = ""');
      console.log('✅ Data copied successfully');
    } catch (error) {
      console.log(`ℹ️  Data copy: ${error.message}`);
    }
    
    // Verify the final table structure
    console.log('\n🔍 Verifying final table structure...');
    const [columns] = await connection.execute('DESCRIBE media_files');
    
    console.log('📋 media_files table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? col.Key : ''}`);
    });
    
    await connection.end();
    console.log('\n✅ Table alteration completed!');
    
  } catch (error) {
    console.error('❌ Failed to alter table:', error.message);
    throw error;
  }
}

alterMediaFilesTable().then(() => {
  console.log('\n🚀 Database schema is now compatible!');
  console.log('💡 You can now start your server with: npm start');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Alteration failed:', error.message);
  process.exit(1);
});
