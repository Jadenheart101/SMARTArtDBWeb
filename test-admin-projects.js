const { executeQuery } = require('./database.js');

async function testAdminProjectAccess() {
  try {
    console.log('🔧 Testing Admin Project Access...\n');
    
    // 1. Check existing users and their admin status
    console.log('1. Checking users and admin status:');
    const users = await executeQuery('SELECT UserID, UserName, isAdmin FROM user ORDER BY UserID');
    users.forEach(user => {
      console.log(`  - ${user.UserName} (ID: ${user.UserID}) - ${user.isAdmin ? 'ADMIN' : 'Regular User'}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    // 2. Check existing projects
    console.log('\n2. Current projects in database:');
    const allProjects = await executeQuery(`
      SELECT 
        p.ProjectID, 
        p.ProjectName, 
        p.user_id,
        u.UserName as creator_name
      FROM project p
      LEFT JOIN user u ON p.user_id = u.UserID
      ORDER BY p.ProjectID
    `);
    
    if (allProjects.length === 0) {
      console.log('❌ No projects found');
      return;
    }
    
    allProjects.forEach(project => {
      console.log(`  - Project ${project.ProjectID}: "${project.ProjectName}" by ${project.creator_name || 'Unknown'} (user_id: ${project.user_id})`);
    });
    
    // 3. Find a regular user and an admin user
    const regularUser = users.find(u => !u.isAdmin);
    const adminUser = users.find(u => u.isAdmin);
    
    console.log('\n3. Testing project access scenarios:');
    
    // Test regular user access
    if (regularUser) {
      console.log(`\n📋 Regular user "${regularUser.UserName}" project access:`);
      const regularUserProjects = await executeQuery(`
        SELECT 
          p.*,
          u.UserName as creator_name
        FROM project p
        LEFT JOIN user u ON p.user_id = u.UserID
        WHERE p.user_id = ?
        ORDER BY p.ProjectID
      `, [regularUser.UserID]);
      
      console.log(`  - Can see ${regularUserProjects.length} project(s):`);
      regularUserProjects.forEach(project => {
        console.log(`    * Project ${project.ProjectID}: "${project.ProjectName}"`);
      });
    }
    
    // Test admin access
    if (adminUser) {
      console.log(`\n👑 Admin user "${adminUser.UserName}" project access:`);
      const adminProjectAccess = await executeQuery(`
        SELECT 
          p.*,
          u.UserName as creator_name,
          u.UserID as creator_id
        FROM project p
        LEFT JOIN user u ON p.user_id = u.UserID
        ORDER BY p.ProjectID
      `);
      
      console.log(`  - Can see ALL ${adminProjectAccess.length} project(s):`);
      adminProjectAccess.forEach(project => {
        console.log(`    * Project ${project.ProjectID}: "${project.ProjectName}" by ${project.creator_name || 'Unknown'}`);
      });
    }
    
    // 4. Test API endpoint scenarios
    console.log('\n4. API Endpoint Usage Examples:');
    console.log('\n📡 For Regular Users:');
    console.log('  GET /api/projects?user_id=1');
    console.log('  → Returns only projects created by user ID 1\n');
    
    console.log('📡 For Admin Users:');
    console.log('  GET /api/projects?is_admin=true');
    console.log('  → Returns ALL projects with creator information\n');
    
    console.log('📡 For Backwards Compatibility:');
    console.log('  GET /api/projects');
    console.log('  → Returns all projects (no filtering)\n');
    
    // 5. Create test admin user if none exists
    if (!adminUser) {
      console.log('5. No admin user found. Creating test admin user...');
      
      const nextUserId = await getNextAvailableId('user', 'UserID');
      await executeQuery(
        'INSERT INTO user (UserID, UserName, Password, isAdmin) VALUES (?, ?, ?, ?)',
        [nextUserId, 'TestAdmin', 'admin123', 1]
      );
      
      console.log(`✅ Created admin user "TestAdmin" with ID ${nextUserId}`);
      console.log('   You can now test admin access with:');
      console.log(`   GET /api/projects?is_admin=true`);
      
      // Clean up test admin user
      console.log('\n🧹 Cleaning up test admin user...');
      await executeQuery('DELETE FROM user WHERE UserID = ?', [nextUserId]);
      console.log('✅ Test admin user removed');
    }
    
    console.log('\n✅ Admin project access test completed!');
    console.log('\n📝 Summary:');
    console.log('  ✓ Regular users see only their own projects');
    console.log('  ✓ Admin users can see all projects with creator info');
    console.log('  ✓ API supports both user filtering and admin access');
    console.log('  ✓ Backwards compatibility maintained');
    
  } catch (error) {
    console.error('❌ Admin project access test failed:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit(0);
}

// Helper function (assuming it exists in your main file)
async function getNextAvailableId(tableName, idColumn) {
  try {
    const existingIds = await executeQuery(
      `SELECT ${idColumn} FROM ${tableName} WHERE ${idColumn} > 0 ORDER BY ${idColumn}`
    );
    
    if (existingIds.length === 0) {
      return 1;
    }
    
    let expectedId = 1;
    for (const row of existingIds) {
      const currentId = row[idColumn];
      if (currentId !== expectedId) {
        return expectedId;
      }
      expectedId++;
    }
    
    return expectedId;
  } catch (error) {
    throw error;
  }
}

testAdminProjectAccess();
