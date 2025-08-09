const mysql = require('mysql2/promise');
require('dotenv').config();

async function testArtInfoProtection() {
  console.log('🧪 Testing Art Info Protection System...\n');
  
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
    
    console.log('🔍 ANALYSIS: Art Info Protection Status');
    console.log('==========================================');
    
    // Test 1: Check all art records and their protection status
    console.log('\n1️⃣ Art Records Protection Analysis:');
    const [artAnalysis] = await connection.execute(`
      SELECT 
        a.ArtId, 
        a.ArtName, 
        a.ArtistName, 
        a.artcol,
        mf.id as MediaFileId,
        mf.filename as MediaFilename,
        CASE 
          WHEN mf.id IS NOT NULL THEN '🛡️ PROTECTED'
          WHEN a.artcol IS NULL OR a.artcol = '' THEN '⚠️ ORPHANED (No Link)'
          WHEN a.artcol REGEXP '^[0-9]+$' THEN '💥 ORPHANED (Broken Link)'
          ELSE '❓ ORPHANED (Invalid Link)'
        END as ProtectionStatus
      FROM art a 
      LEFT JOIN media_files mf ON (
        a.artcol REGEXP '^[0-9]+$' AND CAST(a.artcol AS UNSIGNED) = mf.id
      )
      ORDER BY a.ArtId
    `);
    
    let protectedCount = 0;
    let orphanedNoLinkCount = 0;
    let orphanedBrokenLinkCount = 0;
    
    artAnalysis.forEach(art => {
      console.log(`   ${art.ProtectionStatus} ID ${art.ArtId}: "${art.ArtName}" by ${art.ArtistName}`);
      if (art.MediaFilename) {
        console.log(`      📁 Linked to: ${art.MediaFilename} (Media ID: ${art.MediaFileId})`);
      } else if (art.artcol) {
        console.log(`      🔗 Broken link to Media ID: ${art.artcol}`);
      } else {
        console.log(`      ❌ No media file link`);
      }
      
      if (art.ProtectionStatus.includes('PROTECTED')) {
        protectedCount++;
      } else if (art.ProtectionStatus.includes('No Link')) {
        orphanedNoLinkCount++;
      } else {
        orphanedBrokenLinkCount++;
      }
    });
    
    console.log('\n📊 Protection Summary:');
    console.log(`🛡️ Protected records: ${protectedCount}`);
    console.log(`⚠️ Orphaned (no link): ${orphanedNoLinkCount}`);
    console.log(`💥 Orphaned (broken link): ${orphanedBrokenLinkCount}`);
    console.log(`📝 Total art records: ${artAnalysis.length}`);
    
    // Test 2: Check which media files are protected by art info
    console.log('\n\n2️⃣ Media Files Protected by Art Info:');
    const [protectedMedia] = await connection.execute(`
      SELECT 
        mf.id,
        mf.filename,
        mf.original_name,
        COUNT(a.ArtId) as ArtRecordCount,
        GROUP_CONCAT(CONCAT(a.ArtName, ' by ', a.ArtistName) SEPARATOR '; ') as ArtInfo
      FROM media_files mf
      JOIN art a ON CAST(a.artcol AS UNSIGNED) = mf.id
      GROUP BY mf.id, mf.filename, mf.original_name
      ORDER BY mf.id
    `);
    
    console.log(`📁 ${protectedMedia.length} media files are protected by art info:`);
    protectedMedia.forEach(media => {
      console.log(`   🛡️ Media ID ${media.id}: ${media.filename}`);
      console.log(`      📝 Original: ${media.original_name}`);
      console.log(`      🎨 Art Records (${media.ArtRecordCount}): ${media.ArtInfo}`);
      console.log('');
    });
    
    // Test 3: Check media files that would be considered for cleanup
    console.log('\n3️⃣ Media Files Cleanup Risk Analysis:');
    const [allMedia] = await connection.execute(`
      SELECT 
        mf.id,
        mf.filename,
        mf.original_name,
        CASE 
          WHEN art_link.art_media_id IS NOT NULL THEN 'Protected by Art Info'
          WHEN project_link.project_media_id IS NOT NULL THEN 'Protected by Project'
          WHEN card_link.card_media_id IS NOT NULL THEN 'Protected by Card'
          ELSE 'AT RISK - No protection found'
        END as ProtectionSource
      FROM media_files mf
      LEFT JOIN (
        SELECT DISTINCT CAST(artcol AS UNSIGNED) as art_media_id 
        FROM art 
        WHERE artcol IS NOT NULL AND artcol != '' AND artcol REGEXP '^[0-9]+$'
      ) art_link ON mf.id = art_link.art_media_id
      LEFT JOIN (
        SELECT DISTINCT image_id as project_media_id 
        FROM project 
        WHERE image_id IS NOT NULL
      ) project_link ON mf.id = project_link.project_media_id
      LEFT JOIN (
        SELECT DISTINCT Media_ID_FK as card_media_id 
        FROM card_media
      ) card_link ON mf.id = card_link.card_media_id
      ORDER BY 
        CASE 
          WHEN art_link.art_media_id IS NOT NULL OR project_link.project_media_id IS NOT NULL OR card_link.card_media_id IS NOT NULL 
          THEN 0 
          ELSE 1 
        END,
        mf.id
    `);
    
    let protectedByArt = 0;
    let protectedByProject = 0;
    let protectedByCard = 0;
    let atRisk = 0;
    
    allMedia.forEach(media => {
      const icon = media.ProtectionSource.includes('AT RISK') ? '⚠️' : '🛡️';
      console.log(`   ${icon} Media ID ${media.id}: ${media.filename}`);
      console.log(`      ${media.ProtectionSource}`);
      
      if (media.ProtectionSource.includes('Art Info')) protectedByArt++;
      else if (media.ProtectionSource.includes('Project')) protectedByProject++;
      else if (media.ProtectionSource.includes('Card')) protectedByCard++;
      else atRisk++;
    });
    
    console.log('\n📊 Media Protection Summary:');
    console.log(`🎨 Protected by Art Info: ${protectedByArt}`);
    console.log(`📋 Protected by Projects: ${protectedByProject}`);
    console.log(`🃏 Protected by Cards: ${protectedByCard}`);
    console.log(`⚠️ At Risk (no protection): ${atRisk}`);
    console.log(`📁 Total media files: ${allMedia.length}`);
    
    // Test 4: Simulate what the cleanup would find
    console.log('\n\n4️⃣ Cleanup Simulation (References that would protect files):');
    
    // Simulate the enhanced cleanup queries
    const [artFiles] = await connection.execute(`
      SELECT mf.id, mf.file_path, mf.filename, a.ArtId, a.ArtName 
      FROM art a 
      JOIN media_files mf ON CAST(a.artcol AS UNSIGNED) = mf.id 
      WHERE a.artcol IS NOT NULL AND a.artcol != ''
    `);
    
    const [projectFiles] = await connection.execute(`
      SELECT mf.id, mf.file_path, mf.filename, p.ProjectID, p.ProjectName 
      FROM project p 
      JOIN media_files mf ON p.image_id = mf.id 
      WHERE p.image_id IS NOT NULL
    `);
    
    const [cardFiles] = await connection.execute(`
      SELECT mf.id, mf.file_path, mf.filename, cm.Card_ID_FK as card_id
      FROM card_media cm 
      JOIN media_files mf ON cm.Media_ID_FK = mf.id
    `);
    
    console.log(`🎨 Art Info References: ${artFiles.length} files`);
    artFiles.forEach(file => {
      console.log(`   📁 ${file.filename} → Art: "${file.ArtName}" (ID: ${file.ArtId})`);
    });
    
    console.log(`\n📋 Project References: ${projectFiles.length} files`);
    projectFiles.forEach(file => {
      console.log(`   📁 ${file.filename} → Project: "${file.ProjectName}" (ID: ${file.ProjectID})`);
    });
    
    console.log(`\n🃏 Card References: ${cardFiles.length} files`);
    cardFiles.forEach(file => {
      console.log(`   📁 ${file.filename} → Card ID: ${file.card_id}`);
    });
    
    // Test 5: Check for potential issues
    console.log('\n\n5️⃣ Potential Issues Detection:');
    
    // Check for art records with invalid media IDs
    const [invalidArt] = await connection.execute(`
      SELECT a.ArtId, a.ArtName, a.artcol
      FROM art a
      LEFT JOIN media_files mf ON CAST(a.artcol AS UNSIGNED) = mf.id
      WHERE a.artcol IS NOT NULL 
        AND a.artcol != '' 
        AND mf.id IS NULL
    `);
    
    if (invalidArt.length > 0) {
      console.log(`⚠️ Found ${invalidArt.length} art records with broken media links:`);
      invalidArt.forEach(art => {
        console.log(`   💥 Art ID ${art.ArtId}: "${art.ArtName}" → Missing Media ID ${art.artcol}`);
      });
    } else {
      console.log('✅ No broken art-to-media links found');
    }
    
    // Check for projects with invalid media IDs
    const [invalidProjects] = await connection.execute(`
      SELECT p.ProjectID, p.ProjectName, p.image_id
      FROM project p
      LEFT JOIN media_files mf ON p.image_id = mf.id
      WHERE p.image_id IS NOT NULL 
        AND mf.id IS NULL
    `);
    
    if (invalidProjects.length > 0) {
      console.log(`⚠️ Found ${invalidProjects.length} projects with broken media links:`);
      invalidProjects.forEach(project => {
        console.log(`   💥 Project ID ${project.ProjectID}: "${project.ProjectName}" → Missing Media ID ${project.image_id}`);
      });
    } else {
      console.log('✅ No broken project-to-media links found');
    }
    
    await connection.end();
    
    console.log('\n==========================================');
    console.log('🎯 CONCLUSION: Art Info Protection Test Results');
    console.log('==========================================');
    console.log(`✅ ${protectedCount} art records are properly protected`);
    console.log(`✅ ${protectedMedia.length} media files have art info protection`);
    console.log(`✅ Enhanced cleanup would protect ${artFiles.length} files via art info`);
    
    if (orphanedBrokenLinkCount > 0 || invalidArt.length > 0) {
      console.log(`⚠️ ${orphanedBrokenLinkCount + invalidArt.length} broken links need attention`);
    }
    
    console.log('\n🧪 Art Info Protection System: OPERATIONAL ✅');
    
  } catch (error) {
    console.error('❌ Art info protection test failed:', error.message);
    throw error;
  }
}

testArtInfoProtection().then(() => {
  console.log('\n🏁 Art info protection test completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Protection test failed:', error.message);
  process.exit(1);
});
