const mysql = require('mysql2/promise');
require('dotenv').config();

async function addImageIdToProject() {
  console.log('🔧 Adding image_id column to project table...\n');
  
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
    
    // Add image_id column to project table
    try {
      console.log('🔧 Adding image_id column to project table...');
      await connection.execute('ALTER TABLE project ADD COLUMN image_id INT AFTER Description');
      console.log('✅ image_id column added successfully');
    } catch (error) {
      if (error.message.includes('Duplicate column name') || error.message.includes('already exists')) {
        console.log('ℹ️  image_id column already exists');
      } else {
        console.log(`❌ Error adding image_id column: ${error.message}`);
      }
    }
    
    // Add foreign key constraint (optional)
    try {
      console.log('🔧 Adding foreign key constraint for image_id...');
      await connection.execute('ALTER TABLE project ADD FOREIGN KEY (image_id) REFERENCES media_files(id) ON DELETE SET NULL');
      console.log('✅ Foreign key constraint added');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate key name')) {
        console.log('ℹ️  Foreign key constraint already exists');
      } else {
        console.log(`❌ Error adding foreign key: ${error.message}`);
      }
    }
    
    // Verify the project table structure
    console.log('\n🔍 Verifying project table structure...');
    const [columns] = await connection.execute('DESCRIBE project');
    
    console.log('📋 project table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? col.Key : ''}`);
    });
    
    await connection.end();
    console.log('\n✅ Project table update completed!');
    
  } catch (error) {
    console.error('❌ Failed to update project table:', error.message);
    throw error;
  }
}

addImageIdToProject().then(() => {
  console.log('\n🚀 Project table is now compatible!');
  console.log('💡 You can now start your server with: npm start');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Update failed:', error.message);
  process.exit(1);
});
