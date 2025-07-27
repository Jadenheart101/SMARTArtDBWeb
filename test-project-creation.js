const { executeQuery } = require('./database.js');

async function testProjectCreation() {
  try {
    console.log('🧪 Testing Project Creation...\n');
    
    // 1. Check if we have users
    const users = await executeQuery('SELECT UserID, UserName FROM user LIMIT 3');
    console.log('Available users:', users);
    
    if (users.length === 0) {
      console.log('❌ No users found. Creating a test user...');
      
      // Create a test user
      await executeQuery(
        'INSERT INTO user (UserID, UserName, Password, isAdmin) VALUES (?, ?, ?, ?)',
        [999, 'TestUser', 'password123', 0]
      );
      
      console.log('✅ Test user created');
    }
    
    const testUserId = users.length > 0 ? users[0].UserID : 999;
    
    // 2. Check existing projects
    const existingProjects = await executeQuery('SELECT ProjectID, ProjectName FROM project ORDER BY ProjectID');
    console.log('Existing projects:', existingProjects);
    
    // 3. Test project creation step by step
    console.log('\n🏗️ Creating test project...');
    
    // Get next available project ID
    const existingIds = await executeQuery('SELECT ProjectID FROM project WHERE ProjectID > 0 ORDER BY ProjectID');
    console.log('Existing project IDs:', existingIds.map(row => row.ProjectID));
    
    let nextId = 1;
    for (const row of existingIds) {
      if (row.ProjectID !== nextId) {
        break;
      }
      nextId++;
    }
    
    console.log('Next available project ID:', nextId);
    
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date:', today);
    
    // Create project
    console.log('Inserting into project table...');
    const projectResult = await executeQuery(
      'INSERT INTO project (ProjectID, ProjectName, user_id, Approved, NeedsReview, DateCreated, DateModified) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nextId, 'Test Project Creation', testUserId, 0, 1, today, today]
    );
    
    console.log('Project creation result:', projectResult);
    
    // Add to project_users
    console.log('Adding user to project_users table...');
    const userResult = await executeQuery(
      'INSERT INTO project_users (project_id, user_id, role, added_by) VALUES (?, ?, ?, ?)',
      [nextId, testUserId, 'owner', testUserId]
    );
    
    console.log('Project user creation result:', userResult);
    
    // Verify creation
    const newProject = await executeQuery('SELECT * FROM project WHERE ProjectID = ?', [nextId]);
    const projectUsers = await executeQuery('SELECT * FROM project_users WHERE project_id = ?', [nextId]);
    
    console.log('\n✅ Project created successfully:');
    console.log('Project data:', newProject[0]);
    console.log('Project users:', projectUsers);
    
    // Clean up
    console.log('\n🧹 Cleaning up test project...');
    await executeQuery('DELETE FROM project WHERE ProjectID = ?', [nextId]);
    
    // Clean up test user if we created one
    if (users.length === 0) {
      await executeQuery('DELETE FROM user WHERE UserID = 999');
      console.log('✅ Test user cleaned up');
    }
    
    console.log('✅ Project creation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Project creation test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    console.error('Error sqlState:', error.sqlState);
    console.error('Error sqlMessage:', error.sqlMessage);
    console.error('Full error:', error);
    
    // Try to diagnose the issue
    console.log('\n🔍 Diagnosing the issue...');
    
    try {
      // Check if project table exists and its structure
      const projectTableInfo = await executeQuery('DESCRIBE project');
      console.log('Project table structure:', projectTableInfo);
    } catch (describeError) {
      console.error('❌ Could not describe project table:', describeError.message);
    }
    
    try {
      // Check if project_users table exists and its structure
      const projectUsersTableInfo = await executeQuery('DESCRIBE project_users');
      console.log('Project_users table structure:', projectUsersTableInfo);
    } catch (describeError) {
      console.error('❌ Could not describe project_users table:', describeError.message);
    }
  }
  
  process.exit(0);
}

testProjectCreation();
