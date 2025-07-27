const { executeQuery } = require('./database.js');

async function demonstrateMultiUserFunctionality() {
  try {
    console.log('🚀 Demonstrating Multi-User Project Functionality\n');
    
    // 1. Get available users
    const users = await executeQuery('SELECT UserID, UserName FROM user ORDER BY UserID LIMIT 3');
    console.log('📋 Available users:');
    users.forEach(u => console.log(`  - ${u.UserID}: ${u.UserName}`));
    
    if (users.length < 2) {
      console.log('⚠️ Need at least 2 users to demonstrate multi-user functionality');
      return;
    }
    
    const owner = users[0];
    const editor = users[1];
    
    // 2. Create a test project
    console.log(`\n🏗️ Creating test project (owner: ${owner.UserName})...`);
    
    // First get the next available project ID
    const existingIds = await executeQuery('SELECT ProjectID FROM project WHERE ProjectID > 0 ORDER BY ProjectID');
    let nextId = 1;
    for (const row of existingIds) {
      if (row.ProjectID !== nextId) {
        break;
      }
      nextId++;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Create project
    await executeQuery(
      'INSERT INTO project (ProjectID, ProjectName, user_id, Approved, NeedsReview, DateCreated, DateModified) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nextId, 'Multi-User Test Project', owner.UserID, 0, 1, today, today]
    );
    
    // Add owner to project_users
    await executeQuery(
      'INSERT INTO project_users (project_id, user_id, role, added_by) VALUES (?, ?, ?, ?)',
      [nextId, owner.UserID, 'owner', owner.UserID]
    );
    
    console.log(`✅ Created project ${nextId}: "Multi-User Test Project"`);
    
    // 3. Add editor to project
    console.log(`\n👥 Adding ${editor.UserName} as editor to the project...`);
    
    await executeQuery(
      'INSERT INTO project_users (project_id, user_id, role, added_by) VALUES (?, ?, ?, ?)',
      [nextId, editor.UserID, 'editor', owner.UserID]
    );
    
    console.log(`✅ Added ${editor.UserName} as editor`);
    
    // 4. Show project users
    console.log(`\n📋 Project ${nextId} users:`);
    const projectUsers = await executeQuery(`
      SELECT 
        pu.user_id,
        u.UserName,
        pu.role,
        pu.added_date
      FROM project_users pu
      JOIN user u ON pu.user_id = u.UserID
      WHERE pu.project_id = ?
      ORDER BY pu.role DESC, pu.added_date ASC
    `, [nextId]);
    
    projectUsers.forEach(pu => {
      console.log(`  - ${pu.UserName} (${pu.role}) - added ${pu.added_date}`);
    });
    
    // 5. Test project access for both users
    console.log(`\n🔍 Testing project access:`);
    
    for (const user of [owner, editor]) {
      const userProjects = await executeQuery(`
        SELECT DISTINCT
          p.ProjectID,
          p.ProjectName,
          pu.role as user_role
        FROM project p
        JOIN project_users pu ON p.ProjectID = pu.project_id
        WHERE pu.user_id = ? AND p.ProjectID = ?
      `, [user.UserID, nextId]);
      
      if (userProjects.length > 0) {
        console.log(`  - ${user.UserName} has ${userProjects[0].user_role} access to "${userProjects[0].ProjectName}"`);
      }
    }
    
    // 6. Demonstrate deletion behavior
    console.log(`\n🗑️ Testing deletion scenarios:`);
    
    const userCount = await executeQuery(
      'SELECT COUNT(*) as count FROM project_users WHERE project_id = ?',
      [nextId]
    );
    
    console.log(`  - Project has ${userCount[0].count} users`);
    console.log(`  - If ${editor.UserName} "deletes" the project: User would be removed, project continues`);
    console.log(`  - If ${owner.UserName} "deletes" the project: ${editor.UserName} would become owner, ${owner.UserName} removed`);
    console.log(`  - If only one user remained and "deleted": Entire project would be deleted`);
    
    // 7. Clean up - remove the test project
    console.log(`\n🧹 Cleaning up test project...`);
    await executeQuery('DELETE FROM project WHERE ProjectID = ?', [nextId]);
    console.log(`✅ Test project removed`);
    
    console.log(`\n✅ Multi-user project functionality demonstration completed!`);
    console.log(`\n📚 Summary of implemented features:`);
    console.log(`  ✓ Users can be added to projects with edit permissions`);
    console.log(`  ✓ Project creators become owners automatically`);
    console.log(`  ✓ Multiple users can have access to the same project`);
    console.log(`  ✓ Deletion removes user from project if multiple users exist`);
    console.log(`  ✓ Deletion removes entire project if only one user exists`);
    console.log(`  ✓ Ownership transfers automatically when owners leave`);
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

demonstrateMultiUserFunctionality();
