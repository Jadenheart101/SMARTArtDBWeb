const { executeQuery } = require('./database.js');

async function checkDatabaseRelationships() {
    try {
        console.log('=== Checking if artcol contains file paths ===');
        const artWithPaths = await executeQuery(`
            SELECT ArtId, ArtName, artcol 
            FROM art 
            WHERE artcol LIKE '%/uploads/%' 
               OR artcol LIKE '%.jpg%' 
               OR artcol LIKE '%.png%' 
            LIMIT 10
        `);
        console.log('Art records with potential file paths:');
        console.table(artWithPaths);
        
        console.log('=== Checking project-media relationships ===');
        const projectMedia = await executeQuery(`
            SELECT p.ProjectID, p.ProjectName, p.image_id, m.file_name 
            FROM project p 
            LEFT JOIN media_files m ON p.image_id = m.id 
            WHERE p.image_id IS NOT NULL 
            LIMIT 10
        `);
        console.log('Projects with media references:');
        console.table(projectMedia);
        
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

checkDatabaseRelationships();
