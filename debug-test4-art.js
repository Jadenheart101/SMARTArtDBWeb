const { executeQuery } = require('./database.js');

async function debugTest4Art() {
    try {
        console.log('🔍 === DEBUGGING TEST 4 ART INFO ===');
        
        // 1. Find project "test 4"
        console.log('\n1. Looking for "test 4" project...');
        const projects = await executeQuery(
            "SELECT ProjectID, ProjectName, Description, image_id FROM project WHERE ProjectName LIKE '%test 4%' OR ProjectName LIKE '%test4%'"
        );
        
        if (projects.length === 0) {
            console.log('❌ No project found with name containing "test 4"');
            
            // Show all projects
            console.log('\n📋 All projects in database:');
            const allProjects = await executeQuery("SELECT ProjectID, ProjectName, Description, image_id FROM project");
            allProjects.forEach(p => {
                console.log(`  - ID ${p.ProjectID}: "${p.ProjectName}" (image_id: ${p.image_id})`);
            });
            return;
        }
        
        const project = projects[0];
        console.log(`✅ Found project: ID ${project.ProjectID}, Name: "${project.ProjectName}"`);
        console.log(`   Description: ${project.Description || 'NULL'}`);
        console.log(`   image_id: ${project.image_id || 'NULL'}`);
        
        // 2. Check if project has an image
        if (project.image_id) {
            console.log(`\n2. Checking media file for image_id ${project.image_id}...`);
            const mediaFiles = await executeQuery(
                "SELECT * FROM media_files WHERE id = ?", 
                [project.image_id]
            );
            
            if (mediaFiles.length > 0) {
                const media = mediaFiles[0];
                console.log(`✅ Media file found:`);
                console.log(`   ID: ${media.id}`);
                console.log(`   file_name: ${media.file_name}`);
                console.log(`   file_path: ${media.file_path}`);
                console.log(`   file_url: ${media.file_url}`);
                
                // 3. Check if art info exists for this media
                console.log(`\n3. Checking art info for media file "${media.file_name}"...`);
                const artInfo = await executeQuery(
                    "SELECT * FROM art WHERE MediaID = ?",
                    [media.file_name]
                );
                
                if (artInfo.length > 0) {
                    console.log(`✅ Art info found:`);
                    artInfo.forEach(art => {
                        console.log(`   ArtId: ${art.ArtId}`);
                        console.log(`   ArtistName: ${art.ArtistName}`);
                        console.log(`   ArtName: ${art.ArtName}`);
                        console.log(`   ArtMedia: ${art.ArtMedia}`);
                        console.log(`   MediaID: ${art.MediaID}`);
                        console.log(`   Submitor: ${art.Submitor}`);
                        console.log(`   Date: ${art.Date}`);
                    });
                } else {
                    console.log(`❌ No art info found for media "${media.file_name}"`);
                    
                    // Check all art records to see what MediaIDs exist
                    console.log(`\n🔍 All art records in database:`);
                    const allArt = await executeQuery("SELECT ArtId, MediaID, ArtistName, ArtName FROM art");
                    allArt.forEach(art => {
                        console.log(`   ArtId ${art.ArtId}: MediaID="${art.MediaID}", Artist="${art.ArtistName}", Art="${art.ArtName}"`);
                    });
                }
            } else {
                console.log(`❌ No media file found for image_id ${project.image_id}`);
            }
        } else {
            console.log(`\n2. Project has no image_id - no art info possible`);
        }
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
    }
    
    process.exit(0);
}

debugTest4Art();
