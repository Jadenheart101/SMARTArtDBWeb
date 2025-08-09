const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTestArtData() {
  console.log('🎨 Adding test art info data to art table...\n');
  
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
    
    // First, check existing data
    console.log('🔍 Checking existing data...');
    
    // Check existing media files
    const [mediaFiles] = await connection.execute('SELECT id, filename, original_name FROM media_files ORDER BY id LIMIT 10');
    console.log(`📁 Found ${mediaFiles.length} media files:`);
    mediaFiles.forEach(file => {
      console.log(`  - ID ${file.id}: ${file.filename} (${file.original_name})`);
    });
    
    // Check existing projects
    const [projects] = await connection.execute('SELECT ProjectID, ProjectName, image_id FROM project ORDER BY ProjectID LIMIT 5');
    console.log(`\n📋 Found ${projects.length} projects:`);
    projects.forEach(project => {
      console.log(`  - ID ${project.ProjectID}: "${project.ProjectName}" (image_id: ${project.image_id})`);
    });
    
    // Check existing art records
    const [existingArt] = await connection.execute('SELECT ArtId, ArtName, artcol FROM art ORDER BY ArtId');
    console.log(`\n🎨 Found ${existingArt.length} existing art records:`);
    existingArt.forEach(art => {
      console.log(`  - ID ${art.ArtId}: "${art.ArtName}" (linked to media: ${art.artcol})`);
    });
    
    console.log('\n🧪 Creating test art info data...');
    
    // Test data scenarios
    const testArtData = [
      // Scenario 1: Art info linked to existing media files (PROTECTED)
      {
        scenario: 'Linked to existing media file',
        ArtistName: 'Vincent van Gogh',
        Submitor: 'admin',
        Date: '2024-01-15',
        ArtMedia: 'Oil on Canvas',
        ArtName: 'Starry Night Study',
        artcol: mediaFiles.length > 0 ? mediaFiles[0].id.toString() : '1', // Link to first media file
        protected: true
      },
      {
        scenario: 'Linked to existing media file',
        ArtistName: 'Claude Monet',
        Submitor: 'testuser',
        Date: '2024-02-10',
        ArtMedia: 'Oil on Canvas',
        ArtName: 'Water Lilies Impression',
        artcol: mediaFiles.length > 1 ? mediaFiles[1].id.toString() : '2', // Link to second media file
        protected: true
      },
      {
        scenario: 'Linked to project image',
        ArtistName: 'Pablo Picasso',
        Submitor: 'artist1',
        Date: '2024-03-05',
        ArtMedia: 'Acrylic',
        ArtName: 'Modern Abstract',
        artcol: projects.length > 0 && projects[0].image_id ? projects[0].image_id.toString() : '3',
        protected: true
      },
      
      // Scenario 2: Art info with non-existent media file IDs (ORPHANED)
      {
        scenario: 'Linked to non-existent media file',
        ArtistName: 'Salvador Dalí',
        Submitor: 'admin',
        Date: '2024-01-20',
        ArtMedia: 'Surrealism',
        ArtName: 'Persistence of Memory',
        artcol: '999999', // Non-existent media file ID
        protected: false
      },
      {
        scenario: 'Linked to deleted media file',
        ArtistName: 'Jackson Pollock',
        Submitor: 'testuser',
        Date: '2024-02-15',
        ArtMedia: 'Action Painting',
        ArtName: 'Number 1',
        artcol: '888888', // Another non-existent media file ID
        protected: false
      },
      
      // Scenario 3: Art info with NULL or empty artcol (ORPHANED)
      {
        scenario: 'No media file link (NULL)',
        ArtistName: 'Georgia O\'Keeffe',
        Submitor: 'artist1',
        Date: '2024-03-10',
        ArtMedia: 'Oil on Canvas',
        ArtName: 'Red Canna',
        artcol: null,
        protected: false
      },
      {
        scenario: 'No media file link (Empty string)',
        ArtistName: 'Frida Kahlo',
        Submitor: 'admin',
        Date: '2024-03-15',
        ArtMedia: 'Oil on Masonite',
        ArtName: 'Self-Portrait',
        artcol: '',
        protected: false
      },
      
      // Scenario 4: Art info with various media types (some protected, some orphaned)
      {
        scenario: 'Digital art linked to media',
        ArtistName: 'Digital Artist',
        Submitor: 'testuser',
        Date: '2024-04-01',
        ArtMedia: 'Digital',
        ArtName: 'Cyberpunk Cityscape',
        artcol: mediaFiles.length > 2 ? mediaFiles[2].id.toString() : '4',
        protected: true
      },
      {
        scenario: 'Photography orphaned',
        ArtistName: 'Ansel Adams',
        Submitor: 'artist1',
        Date: '2024-04-05',
        ArtMedia: 'Photography',
        ArtName: 'Moonrise Hernandez',
        artcol: '777777', // Non-existent
        protected: false
      },
      {
        scenario: 'Sculpture with documentation',
        ArtistName: 'Auguste Rodin',
        Submitor: 'admin',
        Date: '2024-04-10',
        ArtMedia: 'Bronze',
        ArtName: 'The Thinker',
        artcol: mediaFiles.length > 3 ? mediaFiles[3].id.toString() : '5',
        protected: true
      }
    ];
    
    // Get next available ArtId
    const [maxIdResult] = await connection.execute('SELECT MAX(ArtId) as maxId FROM art');
    let nextArtId = (maxIdResult[0].maxId || 0) + 1;
    
    console.log(`🆔 Starting from ArtId: ${nextArtId}\n`);
    
    // Insert test data
    for (const artData of testArtData) {
      try {
        await connection.execute(
          'INSERT INTO art (ArtId, ArtistName, Submitor, Date, ArtMedia, ArtName, artcol) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [nextArtId, artData.ArtistName, artData.Submitor, artData.Date, artData.ArtMedia, artData.ArtName, artData.artcol]
        );
        
        const protectedStatus = artData.protected ? '🛡️ PROTECTED' : '⚠️ ORPHANED';
        console.log(`✅ Added Art ID ${nextArtId}: "${artData.ArtName}" by ${artData.ArtistName}`);
        console.log(`   📝 Scenario: ${artData.scenario}`);
        console.log(`   🔗 Media Link: ${artData.artcol || 'None'} - ${protectedStatus}`);
        console.log('');
        
        nextArtId++;
      } catch (error) {
        console.error(`❌ Error inserting art "${artData.ArtName}":`, error.message);
      }
    }
    
    // Verify the data
    console.log('🔍 Verifying test data...');
    const [allArt] = await connection.execute(`
      SELECT 
        a.ArtId, 
        a.ArtName, 
        a.ArtistName, 
        a.artcol,
        CASE 
          WHEN mf.id IS NOT NULL THEN 'LINKED TO MEDIA'
          WHEN a.artcol IS NULL OR a.artcol = '' THEN 'NO MEDIA LINK'
          ELSE 'ORPHANED LINK'
        END as LinkStatus,
        mf.filename as MediaFile
      FROM art a 
      LEFT JOIN media_files mf ON CAST(a.artcol AS UNSIGNED) = mf.id 
      WHERE a.ArtId >= ?
      ORDER BY a.ArtId
    `, [nextArtId - testArtData.length]);
    
    console.log('\n📊 Test Data Summary:');
    console.log('=====================================');
    
    let protectedCount = 0;
    let orphanedCount = 0;
    
    allArt.forEach(art => {
      const status = art.LinkStatus === 'LINKED TO MEDIA' ? '🛡️' : '⚠️';
      console.log(`${status} ID ${art.ArtId}: "${art.ArtName}" - ${art.LinkStatus}`);
      if (art.MediaFile) {
        console.log(`   📁 Media: ${art.MediaFile}`);
      }
      
      if (art.LinkStatus === 'LINKED TO MEDIA') {
        protectedCount++;
      } else {
        orphanedCount++;
      }
    });
    
    console.log('=====================================');
    console.log(`🛡️ Protected art records: ${protectedCount}`);
    console.log(`⚠️ Orphaned art records: ${orphanedCount}`);
    console.log(`📊 Total test records: ${allArt.length}`);
    
    await connection.end();
    console.log('\n✅ Test art data creation completed!');
    
  } catch (error) {
    console.error('❌ Failed to create test art data:', error.message);
    throw error;
  }
}

addTestArtData().then(() => {
  console.log('\n🧪 Test data is ready for orphan cleanup testing!');
  console.log('💡 You can now test the cleanup system to verify art info protection');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test data creation failed:', error.message);
  process.exit(1);
});
