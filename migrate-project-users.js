const { executeQuery } = require('./database.js');

async function migrateProjectUsers() {
  try {
    console.log('🔄 Starting project users migration...');
    
    // First, check if migration is needed
    const projectUserCount = await executeQuery('SELECT COUNT(*) as count FROM project_users');
    const projectCount = await executeQuery('SELECT COUNT(*) as count FROM project');
    
    console.log(`📊 Current status:`);
    console.log(`  - Projects: ${projectCount[0].count}`);
    console.log(`  - Project-user relationships: ${projectUserCount[0].count}`);
    
    // Get all projects that don't have corresponding entries in project_users
    const unmigrated = await executeQuery(`
      SELECT p.ProjectID, p.user_id 
      FROM project p 
      LEFT JOIN project_users pu ON p.ProjectID = pu.project_id AND p.user_id = pu.user_id
      WHERE pu.id IS NULL
    `);
    
    console.log(`📋 Projects needing migration: ${unmigrated.length}`);
    
    if (unmigrated.length === 0) {
      console.log('✅ All projects are already migrated!');
      return;
    }
    
    // Migrate each unmigrated project
    let migratedCount = 0;
    for (const project of unmigrated) {
      try {
        await executeQuery(
          'INSERT IGNORE INTO project_users (project_id, user_id, role, added_by) VALUES (?, ?, ?, ?)',
          [project.ProjectID, project.user_id, 'owner', project.user_id]
        );
        
        migratedCount++;
        console.log(`  ✓ Migrated project ${project.ProjectID} (owner: user ${project.user_id})`);
      } catch (error) {
        console.error(`  ✗ Failed to migrate project ${project.ProjectID}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`  - Successfully migrated: ${migratedCount} projects`);
    console.log(`  - Failed: ${unmigrated.length - migratedCount} projects`);
    
    // Verify migration
    const finalCount = await executeQuery('SELECT COUNT(*) as count FROM project_users');
    console.log(`  - Total project-user relationships: ${finalCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

migrateProjectUsers();
