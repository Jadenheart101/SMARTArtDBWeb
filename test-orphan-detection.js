const mysql = require('mysql2/promise');
require('dotenv').config();

async function testOrphanDetection() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Testing orphan detection logic...');

        // Show current art table data
        const [artRecords] = await connection.execute(
            'SELECT ArtId, ArtName, artcol, media_id, project_id FROM art ORDER BY ArtId'
        );
        console.log('📋 Current art records:');
        console.table(artRecords);

        // Show current media files
        const [mediaFiles] = await connection.execute(
            'SELECT id, file_name FROM media_files ORDER BY id'
        );
        console.log('📁 Current media files:');
        console.table(mediaFiles);

        // Test the OLD orphan detection logic (string-based filename lookup)
        console.log('\n❌ OLD LOGIC (flawed string-based filename lookup):');
        const [oldOrphans] = await connection.execute(`
            SELECT a.ArtId, a.ArtName, a.ArtMedia, 'Invalid ArtMedia reference' as reason
            FROM art a 
            LEFT JOIN media_files m ON a.ArtMedia = m.filename 
            WHERE m.filename IS NULL AND a.ArtMedia IS NOT NULL AND a.ArtMedia != ''
        `);
        console.log(`Found ${oldOrphans.length} "orphans" with old logic:`);
        console.table(oldOrphans);

        // Test the NEW orphan detection logic (proper foreign key lookup)
        console.log('\n✅ NEW LOGIC (proper foreign key lookup):');
        const [newOrphans] = await connection.execute(`
            SELECT a.ArtId, a.ArtName, a.media_id, 'Invalid media_id reference' as reason
            FROM art a 
            LEFT JOIN media_files m ON a.media_id = m.id 
            WHERE a.media_id IS NOT NULL AND m.id IS NULL
        `);
        console.log(`Found ${newOrphans.length} orphans with new logic:`);
        console.table(newOrphans);

        // Test files that are properly referenced
        console.log('\n📎 Properly referenced art records:');
        const [referencedArt] = await connection.execute(`
            SELECT a.ArtId, a.ArtName, a.media_id, m.file_name
            FROM art a 
            JOIN media_files m ON a.media_id = m.id 
            WHERE a.media_id IS NOT NULL
        `);
        console.table(referencedArt);

        console.log('\n🎯 Summary:');
        console.log(`- Old logic found ${oldOrphans.length} false positives`);
        console.log(`- New logic found ${newOrphans.length} actual orphans`);
        console.log(`- ${referencedArt.length} art records properly referenced`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await connection.end();
    }
}

testOrphanDetection();
