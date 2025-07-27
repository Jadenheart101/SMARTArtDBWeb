const { executeQuery } = require('./database.js');

async function simpleProjectTest() {
  console.log('🧪 Simple Project Creation Test...\n');
  
  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const connectionTest = await executeQuery('SELECT 1 as test');
    console.log('✅ Database connected:', connectionTest);
    
    // 2. Check users table
    console.log('\n2. Checking users...');
    const users = await executeQuery('SELECT UserID, UserName FROM user LIMIT 3');
    console.log('Users found:', users.length);
    
    if (users.length === 0) {
      console.log('❌ No users found. Need to create a user first.');
      return;
    }
    
    const testUserId = users[0].UserID;
    console.log('Using user:', users[0]);
    
    // 3. Check project table structure
    console.log('\n3. Checking project table...');
    const projectStructure = await executeQuery('DESCRIBE project');
    console.log('Project table columns:');
    projectStructure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // 4. Check project_users table structure
    console.log('\n4. Checking project_users table...');
    const projectUsersStructure = await executeQuery('DESCRIBE project_users');
    console.log('Project_users table columns:');
    projectUsersStructure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // 5. Check current projects
    console.log('\n5. Current projects:');
    const currentProjects = await executeQuery('SELECT ProjectID, ProjectName, user_id FROM project');
    console.log('Existing projects:', currentProjects);
    
    // 6. Try to get next ID
    console.log('\n6. Getting next available project ID...');
    const existingIds = await executeQuery('SELECT ProjectID FROM project WHERE ProjectID > 0 ORDER BY ProjectID');
    console.log('Existing IDs:', existingIds.map(row => row.ProjectID));
    
    let nextId = 1;
    for (const row of existingIds) {
      if (row.ProjectID !== nextId) {
        break;
      }
      nextId++;
    }
    console.log('Next available ID:', nextId);
    
    // 7. Test project creation
    console.log('\n7. Creating test project...');
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Inserting project with values:');
    console.log(`  ProjectID: ${nextId}`);
    console.log(`  ProjectName: "Test Project"`);
    console.log(`  user_id: ${testUserId}`);
    console.log(`  Approved: 0`);
    console.log(`  NeedsReview: 1`);
    console.log(`  DateCreated: ${today}`);
    console.log(`  DateModified: ${today}`);
    
    const projectResult = await executeQuery(
      'INSERT INTO project (ProjectID, ProjectName, user_id, Approved, NeedsReview, DateCreated, DateModified) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nextId, 'Test Project', testUserId, 0, 1, today, today]
    );
    
    console.log('✅ Project inserted:', projectResult);
    
    // 8. Add to project_users
    console.log('\n8. Adding to project_users...');
    const userResult = await executeQuery(
      'INSERT INTO project_users (project_id, user_id, role, added_by) VALUES (?, ?, ?, ?)',
      [nextId, testUserId, 'owner', testUserId]
    );
    
    console.log('✅ Project user added:', userResult);
    
    // 9. Verify
    console.log('\n9. Verifying creation...');
    const newProject = await executeQuery('SELECT * FROM project WHERE ProjectID = ?', [nextId]);
    const projectUser = await executeQuery('SELECT * FROM project_users WHERE project_id = ?', [nextId]);
    
    console.log('New project:', newProject[0]);
    console.log('Project user:', projectUser[0]);
    
    // 10. Clean up
    console.log('\n10. Cleaning up...');
    await executeQuery('DELETE FROM project WHERE ProjectID = ?', [nextId]);
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Errno:', error.errno);
    console.error('SQL State:', error.sqlState);
    console.error('SQL Message:', error.sqlMessage);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

simpleProjectTest();
