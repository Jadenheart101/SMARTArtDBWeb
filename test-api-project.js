const fetch = require('node-fetch');

async function testProjectAPI() {
  try {
    console.log('🧪 Testing Project Creation API...\n');
    
    // Test if server is running
    console.log('1. Testing server connection...');
    const apiResponse = await fetch('http://localhost:8080/api');
    const apiData = await apiResponse.json();
    console.log('✅ Server is running:', apiData.message);
    
    // Get users first
    console.log('\n2. Getting available users...');
    const usersResponse = await fetch('http://localhost:8080/api/users');
    const usersData = await usersResponse.json();
    console.log('Users response:', usersData);
    
    if (!usersData.success || usersData.data.length === 0) {
      console.log('❌ No users available for testing');
      return;
    }
    
    const testUser = usersData.data[0];
    console.log('Using test user:', testUser);
    
    // Test project creation
    console.log('\n3. Creating test project...');
    const createResponse = await fetch('http://localhost:8080/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ProjectName: 'API Test Project',
        user_id: testUser.UserID,
        Approved: 0,
        NeedsReview: 1
      })
    });
    
    const createData = await createResponse.json();
    console.log('Create project response:', createData);
    
    if (createData.success) {
      console.log('✅ Project created successfully!');
      
      // Clean up - delete the test project
      console.log('\n4. Cleaning up test project...');
      const deleteResponse = await fetch(`http://localhost:8080/api/projects/${createData.data.ProjectID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: testUser.UserID
        })
      });
      
      const deleteData = await deleteResponse.json();
      console.log('Delete project response:', deleteData);
      
      if (deleteData.success) {
        console.log('✅ Test project cleaned up successfully');
      }
    } else {
      console.log('❌ Project creation failed:', createData);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Check if node-fetch is available, if not use a simpler approach
try {
  require('node-fetch');
  testProjectAPI();
} catch (e) {
  console.log('❌ node-fetch not available. Please install it with: npm install node-fetch');
  console.log('Or test manually by making a POST request to /api/projects');
}
