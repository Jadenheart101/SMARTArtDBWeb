const mysql = require('mysql2/promise');
require('dotenv').config();

async function testArtCreation() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('Testing art creation manually...');
    
    // Try to insert a test art record
    const testData = {
      ArtId: 4,
      ArtistName: 'Test Artist',
      ArtName: 'Test Artwork',
      Submitor: 'Test Submitter',
      ArtMedia: 'Digital',
      Date: new Date().toISOString().split('T')[0]
    };
    
    console.log('Inserting with data:', testData);
    
    const result = await conn.execute(
      'INSERT INTO art (ArtId, ArtistName, Submitor, Date, ArtMedia, ArtName, artcol) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testData.ArtId, testData.ArtistName, testData.Submitor, testData.Date, testData.ArtMedia, testData.ArtName, null]
    );
    
    console.log('✅ Art creation successful:', result);
    
    // Get the created record
    const [records] = await conn.execute('SELECT * FROM art WHERE ArtId = ?', [testData.ArtId]);
    console.log('Created record:', records[0]);
    
    await conn.end();
  } catch (error) {
    console.error('❌ Art creation failed:', error.message);
    console.error('Error details:', error);
  }
}

testArtCreation();
