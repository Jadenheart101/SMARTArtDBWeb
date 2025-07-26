const { executeQuery } = require('./database.js');

async function demonstrateAdminAccess() {
  console.log('🎯 Admin vs Regular User Access Demonstration\n');
  
  try {
    // Get user information
    const users = await executeQuery('SELECT UserID, UserName, isAdmin FROM user ORDER BY UserID LIMIT 5');
    const adminUser = users.find(u => u.isAdmin);
    const regularUser = users.find(u => !u.isAdmin);
    
    console.log('👥 Available Users:');
    users.forEach(user => {
      console.log(`  ${user.isAdmin ? '👑' : '👤'} ${user.UserName} (ID: ${user.UserID}) - ${user.isAdmin ? 'ADMIN' : 'Regular User'}`);
    });
    
    // Get all projects for comparison
    const allProjects = await executeQuery(`
      SELECT p.ProjectID, p.ProjectName, p.user_id, u.UserName as creator_name
      FROM project p
      LEFT JOIN user u ON p.user_id = u.UserID
      ORDER BY p.ProjectID
    `);
    
    console.log(`\n📊 Total Projects in System: ${allProjects.length}`);
    allProjects.forEach(project => {
      console.log(`  - Project ${project.ProjectID}: "${project.ProjectName}" by ${project.creator_name || 'Unknown'}`);
    });
    
    if (regularUser) {
      console.log(`\n👤 Regular User "${regularUser.UserName}" Access:`);
      console.log(`   API Call: GET /api/projects?user_id=${regularUser.UserID}`);
      
      const regularUserProjects = allProjects.filter(p => p.user_id == regularUser.UserID);
      console.log(`   Result: Can see ${regularUserProjects.length} project(s)`);
      regularUserProjects.forEach(project => {
        console.log(`     ✓ Project ${project.ProjectID}: "${project.ProjectName}"`);
      });
      
      if (regularUserProjects.length === 0) {
        console.log('     (No projects owned by this user)');
      }
    }
    
    if (adminUser) {
      console.log(`\n👑 Admin User "${adminUser.UserName}" Access:`);
      console.log(`   API Call: GET /api/projects?is_admin=true`);
      console.log(`   Result: Can see ALL ${allProjects.length} project(s)`);
      allProjects.forEach(project => {
        const isOwn = project.user_id == adminUser.UserID;
        console.log(`     ${isOwn ? '👑' : '👁️ '} Project ${project.ProjectID}: "${project.ProjectName}" by ${project.creator_name || 'Unknown'}`);
      });
    }
    
    console.log('\n🔍 Key Differences:');
    console.log('  👤 Regular Users: Only see projects they created');
    console.log('  👑 Admin Users: See ALL projects with creator information');
    console.log('  📊 Admins get additional fields: creator_name, creator_id');
    
    console.log('\n📡 PowerShell Test Commands:');
    if (regularUser) {
      console.log(`  Regular User: Invoke-RestMethod -Uri "http://localhost:8080/api/projects?user_id=${regularUser.UserID}"`);
    }
    console.log(`  Admin Access: Invoke-RestMethod -Uri "http://localhost:8080/api/projects?is_admin=true"`);
    
    console.log('\n✅ Admin access demonstration completed!');
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error.message);
  }
  
  process.exit(0);
}

demonstrateAdminAccess();
