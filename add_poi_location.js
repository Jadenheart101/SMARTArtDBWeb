// Script to add pLocation column to poi table using existing database configuration
const { executeQuery, testConnection, closePool } = require('./database.js');

async function addPOILocationColumn() {
  try {
    console.log('Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('Failed to connect to database');
      return;
    }

    console.log('Adding pLocation column to poi table...');
    
    // First check if column already exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'poi' AND COLUMN_NAME = 'pLocation'
    `;
    
    const existingColumns = await executeQuery(checkColumnQuery, [process.env.DB_NAME]);
    
    if (existingColumns.length > 0) {
      console.log('✅ pLocation column already exists in poi table');
    } else {
      // Add pLocation column
      const addColumnQuery = `ALTER TABLE poi ADD COLUMN pLocation TEXT DEFAULT NULL`;
      await executeQuery(addColumnQuery);
      console.log('✅ Successfully added pLocation column to poi table');
    }

  } catch (error) {
    console.error('❌ Error adding pLocation column:', error.message);
  } finally {
    await closePool();
  }
}

addPOILocationColumn();
