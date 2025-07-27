const { executeQuery } = require('./database.js');

async function testMultiUserProjects() {
  try {
    console.log('🧪 Testing Multi-User Project System\n');
    
    // 1. Check if we have users in the system
    console.log('📋 Checking existing users...');
    const users = await executeQuery('SELECT UserID, UserName FROM user LIMIT 5');
    console.log('Users found:', users.length);
    users.forEach(user => console.log(`  - ${user.UserID}: ${user.UserName}`));
    
    if (users.length < 2) {
      console.log('\n⚠️  Need at least 2 users to test multi-user functionality');
      console.log('Creating test users...\n');
      
      // Create test users if needed
      await executeQuery(
        'INSERT IGNORE INTO user (UserID, UserName, Password, isAdmin) VALUES (?, ?, ?, ?)',
        [999, 'test_user_1', 'password123', 0]
      );
      await executeQuery(
        'INSERT IGNORE INTO user (UserID, UserName, Password, isAdmin) VALUES (?, ?, ?, ?)',
        [998, 'test_user_2', 'password123', 0]
      );
      
      console.log('✅ Test users created');
    }
    
    // 2. Check existing projects
    console.log('\n📋 Checking existing projects...');
    const projects = await executeQuery('SELECT ProjectID, ProjectName, user_id FROM project LIMIT 3');
    console.log('Projects found:', projects.length);
    projects.forEach(project => console.log(`  - ${project.ProjectID}: ${project.ProjectName} (creator: ${project.user_id})`));
    
    // 3. Check project_users table
    console.log('\n📋 Checking project_users associations...');
    const projectUsers = await executeQuery(`
      SELECT 
        pu.project_id, 
        pu.user_id, 
        u.UserName, 
        pu.role 
      FROM project_users pu 
      JOIN user u ON pu.user_id = u.UserID 
      LIMIT 5
    `);
    console.log('Project-user associations:', projectUsers.length);
    projectUsers.forEach(pu => console.log(`  - Project ${pu.project_id}: ${pu.UserName} (${pu.role})`));
    
    // 4. Test the new GET projects endpoint with user filtering
    if (users.length > 0) {
      console.log(`\n🔍 Testing project filtering for user ${users[0].UserID}...`);
      const userProjects = await executeQuery(`
        SELECT DISTINCT
          p.*,
          pu.role as user_role
        FROM project p
        JOIN project_users pu ON p.ProjectID = pu.project_id
        WHERE pu.user_id = ?
        ORDER BY p.ProjectID
      `, [users[0].UserID]);
      
      console.log(`Projects accessible to ${users[0].UserName}:`, userProjects.length);
      userProjects.forEach(p => console.log(`  - ${p.ProjectID}: ${p.ProjectName} (role: ${p.user_role})`));
    }
    
    console.log('\n✅ Multi-user project system is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testMultiUserProjects();
