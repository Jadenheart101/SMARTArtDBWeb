require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkMediaFiles() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔍 Checking media files structure...\n');

    // Check media files table structure
    const [structure] = await connection.execute('DESCRIBE media_files');
    console.log('📊 Media Files Table Structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key || ''}`);
    });

    // Check sample media files
    const [files] = await connection.execute('SELECT id, filename, file_name, original_filename FROM media_files LIMIT 5');
    console.log('\n📁 Sample Media Files:');
    files.forEach(file => {
      console.log(`  - ID: ${file.id} | Filename: ${file.filename} | File Name: ${file.file_name} | Original: ${file.original_filename}`);
    });

    // Check if the problematic ID exists
    const problemId = '1754743997357_qsutbgg.jpg';
    const [found] = await connection.execute('SELECT * FROM media_files WHERE id = ? OR filename = ? OR file_name = ?', [problemId, problemId, problemId]);
    console.log(`\n🔍 Looking for problematic ID "${problemId}":`);
    if (found.length > 0) {
      console.log('✅ Found:', found[0]);
    } else {
      console.log('❌ Not found in media_files table');
      
      // Check if it might be in filename or file_name fields
      const [similar] = await connection.execute('SELECT * FROM media_files WHERE filename LIKE ? OR file_name LIKE ?', [`%qsutbgg%`, `%qsutbgg%`]);
      console.log('\n🔍 Looking for similar filenames containing "qsutbgg":');
      similar.forEach(file => {
        console.log(`  - ID: ${file.id} | Filename: ${file.filename} | File Name: ${file.file_name}`);
      });
    }

    // Check art table to see what's in artcol
    const [artRecords] = await connection.execute('SELECT ArtId, ArtName, artcol FROM art WHERE artcol LIKE ? LIMIT 5', [`%qsutbgg%`]);
    console.log('\n🎨 Art records with qsutbgg in artcol:');
    artRecords.forEach(art => {
      console.log(`  - Art ID: ${art.ArtId} | Name: ${art.ArtName} | artcol: ${art.artcol}`);
    });

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMediaFiles();
