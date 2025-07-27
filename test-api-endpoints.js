// Test the new multi-user project API endpoints
const testMultiUserAPI = async () => {
  const baseURL = 'http://localhost:8080/api';
  
  try {
    console.log('🧪 Testing Multi-User Project API Endpoints\n');
    
    // Test 1: Get projects for a specific user
    console.log('1️⃣ Testing GET /api/projects?user_id=3');
    const response1 = await fetch(`${baseURL}/projects?user_id=3`);
    const projects = await response1.json();
    console.log('Response:', projects.success ? '✅ Success' : '❌ Failed');
    console.log('Projects found:', projects.data?.length || 0);
    
    if (projects.data && projects.data.length > 0) {
      const projectId = projects.data[0].ProjectID;
      console.log('Using project ID:', projectId);
      
      // Test 2: Get users for a project
      console.log('\n2️⃣ Testing GET /api/projects/:id/users');
      const response2 = await fetch(`${baseURL}/projects/${projectId}/users?user_id=3`);
      const projectUsers = await response2.json();
      console.log('Response:', projectUsers.success ? '✅ Success' : '❌ Failed');
      console.log('Project users:', projectUsers.data?.length || 0);
      
      // Test 3: Add a user to the project (user 1 to project)
      console.log('\n3️⃣ Testing POST /api/projects/:id/users (add user 1)');
      const response3 = await fetch(`${baseURL}/projects/${projectId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,      // Add user 1
          adding_user_id: 3 // User 3 is adding them
        })
      });
      const addResult = await response3.json();
      console.log('Response:', addResult.success ? '✅ Success' : '❌ Failed');
      console.log('Message:', addResult.message);
      
      if (addResult.success) {
        // Test 4: Verify user was added
        console.log('\n4️⃣ Verifying user was added');
        const response4 = await fetch(`${baseURL}/projects/${projectId}/users?user_id=3`);
        const updatedUsers = await response4.json();
        console.log('Updated user count:', updatedUsers.data?.length || 0);
        
        // Test 5: Test user search
        console.log('\n5️⃣ Testing GET /api/users?search=dev');
        const response5 = await fetch(`${baseURL}/users?search=dev`);
        const searchResults = await response5.json();
        console.log('Search results:', searchResults.data?.length || 0);
        
        // Test 6: Remove user from project
        console.log('\n6️⃣ Testing DELETE /api/projects/:id/users/:userId');
        const response6 = await fetch(`${baseURL}/projects/${projectId}/users/1`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            removing_user_id: 3 // User 3 is removing user 1
          })
        });
        const removeResult = await response6.json();
        console.log('Response:', removeResult.success ? '✅ Success' : '❌ Failed');
        console.log('Message:', removeResult.message);
      }
    } else {
      console.log('⚠️  No projects found for user 3, skipping user management tests');
    }
    
    console.log('\n✅ API endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

// Run the test
testMultiUserAPI();
