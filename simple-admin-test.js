const { executeQuery } = require('./database.js');

async function simpleAdminTest() {
  try {
    console.log('🔧 Simple Admin Test...\n');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const connectionTest = await executeQuery('SELECT 1 as test');
    console.log('✅ Database connected');
    
    // 2. Check users
    console.log('\n2. Checking users...');
    const users = await executeQuery('SELECT UserID, UserName, isAdmin FROM user ORDER BY UserID');
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.UserName} (ID: ${user.UserID}) - ${user.isAdmin ? 'ADMIN' : 'Regular User'}`);
    });
    
    // 3. Check projects
    console.log('\n3. Checking projects...');
    const projects = await executeQuery(`
      SELECT 
        p.ProjectID, 
        p.ProjectName, 
        p.user_id,
        u.UserName as creator_name
      FROM project p
      LEFT JOIN user u ON p.user_id = u.UserID
      ORDER BY p.ProjectID
    `);
    
    console.log(`Found ${projects.length} projects:`);
    projects.forEach(project => {
      console.log(`  - Project ${project.ProjectID}: "${project.ProjectName}" by ${project.creator_name || 'Unknown'}`);
    });
    
    // 4. Test admin access query
    console.log('\n4. Testing admin access query...');
    const adminQuery = `
      SELECT 
        p.*,
        m.file_name,
        m.file_path,
        m.displayName as media_display_name,
        u.UserName as creator_name,
        u.UserID as creator_id
      FROM project p
      LEFT JOIN media_files m ON p.image_id = m.id
      LEFT JOIN user u ON p.user_id = u.UserID
      ORDER BY p.ProjectID
    `;
    
    const adminResults = await executeQuery(adminQuery);
    console.log(`Admin query returned ${adminResults.length} projects with full details`);
    
    console.log('\n✅ Admin functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

simpleAdminTest();
