const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateArtForeignKeys() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Starting art table foreign key migration...');

        // First, let's see what art records we have
        const [artRecords] = await connection.execute('SELECT ArtId, artcol FROM art');
        console.log(`📊 Found ${artRecords.length} art records to migrate`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const art of artRecords) {
            const { ArtId, artcol } = art;
            
            if (!artcol) {
                console.log(`⚠️  Skipping ArtId ${ArtId} - no artcol value`);
                skippedCount++;
                continue;
            }

            // artcol contains the media file ID
            const mediaId = parseInt(artcol);
            
            if (isNaN(mediaId)) {
                console.log(`⚠️  Skipping ArtId ${ArtId} - artcol "${artcol}" is not a valid number`);
                skippedCount++;
                continue;
            }

            // Verify the media file exists
            const [mediaFiles] = await connection.execute(
                'SELECT id FROM media_files WHERE id = ?',
                [mediaId]
            );

            if (mediaFiles.length === 0) {
                console.log(`⚠️  Skipping ArtId ${ArtId} - media file ID ${mediaId} not found`);
                skippedCount++;
                continue;
            }

            // Update the art record with the media_id
            await connection.execute(
                'UPDATE art SET media_id = ? WHERE ArtId = ?',
                [mediaId, ArtId]
            );

            console.log(`✅ Updated ArtId ${ArtId} with media_id ${mediaId}`);
            updatedCount++;
        }

        console.log(`🎯 Migration complete: ${updatedCount} updated, ${skippedCount} skipped`);

        // Show the results
        const [updatedRecords] = await connection.execute(
            'SELECT ArtId, artcol, media_id, project_id FROM art ORDER BY ArtId'
        );
        console.log('📋 Updated art records:');
        console.table(updatedRecords);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrateArtForeignKeys();
