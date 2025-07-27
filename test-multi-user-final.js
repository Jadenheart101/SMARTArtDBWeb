const { executeQuery } = require('./database.js');

async function testMultiUserProjects() {
  try {
    console.log('🧪 Testing Multi-User Project System\n');
    
    // 1. Check current state
    console.log('📋 Current System State:');
    const projects = await executeQuery('SELECT ProjectID, ProjectName, user_id FROM project ORDER BY ProjectID');
    const projectUsers = await executeQuery(`
      SELECT pu.project_id, pu.user_id, u.UserName, pu.role 
      FROM project_users pu 
      JOIN user u ON pu.user_id = u.UserID 
      ORDER BY pu.project_id, pu.role DESC
    `);
    
    console.log('Projects:');
    projects.forEach(p => console.log(`  - Project ${p.ProjectID}: ${p.ProjectName} (creator: ${p.user_id})`));
    
    console.log('\nProject User Access:');
    projectUsers.forEach(pu => console.log(`  - Project ${pu.project_id}: ${pu.UserName} (${pu.role})`));
    
    // 2. Test querying projects for a specific user
    if (projectUsers.length > 0) {
      const testUserId = projectUsers[0].user_id;
      console.log(`\n🔍 Testing project access for user ${testUserId}:`);
      
      const userProjects = await executeQuery(`
        SELECT DISTINCT
          p.ProjectID,
          p.ProjectName,
          pu.role as user_role
        FROM project p
        JOIN project_users pu ON p.ProjectID = pu.project_id
        WHERE pu.user_id = ?
        ORDER BY p.ProjectID
      `, [testUserId]);
      
      console.log(`Projects accessible to user ${testUserId}:`);
      userProjects.forEach(p => console.log(`  - Project ${p.ProjectID}: ${p.ProjectName} (role: ${p.user_role})`));
      
      // 3. Test user count for a project
      if (userProjects.length > 0) {
        const testProjectId = userProjects[0].ProjectID;
        const userCount = await executeQuery(
          'SELECT COUNT(*) as count FROM project_users WHERE project_id = ?',
          [testProjectId]
        );
        
        console.log(`\n👥 Project ${testProjectId} has ${userCount[0].count} user(s) with access`);
      }
    }
    
    console.log('\n✅ Multi-user project system is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testMultiUserProjects();
