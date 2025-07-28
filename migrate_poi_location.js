// Simple migration script to add pLocation column to poi table
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addPOILocationColumn() {
  let connection;
  try {
    // Database connection configuration
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'SMARTArt'
    });

    console.log('Connected to database');

    // Add pLocation column if it doesn't exist
    const addColumnQuery = `
      ALTER TABLE poi 
      ADD COLUMN IF NOT EXISTS pLocation TEXT DEFAULT NULL
    `;

    await connection.execute(addColumnQuery);
    console.log('Successfully added pLocation column to poi table');

  } catch (error) {
    console.error('Error adding pLocation column:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addPOILocationColumn();
