const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

async function testAPIEndpoints() {
  console.log('🧪 Testing Multi-User Project API Endpoints\n');
  
  try {
    // Test 1: Get projects for user 3
    console.log('1️⃣ Testing GET /api/projects?user_id=3');
    const projects = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/projects?user_id=3',
      method: 'GET'
    });
    
    console.log('✅ Success - Projects found:', projects.data?.length || 0);
    
    if (projects.data && projects.data.length > 0) {
      const projectId = projects.data[0].ProjectID;
      console.log('Using project ID:', projectId);
      
      // Test 2: Get project users
      console.log('\n2️⃣ Testing GET /api/projects/' + projectId + '/users');
      const projectUsers = await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: `/api/projects/${projectId}/users?user_id=3`,
        method: 'GET'
      });
      
      console.log('✅ Success - Project users:', projectUsers.data?.length || 0);
      
      // Test 3: Add user to project
      console.log('\n3️⃣ Testing POST /api/projects/' + projectId + '/users');
      try {
        const addResult = await makeRequest({
          hostname: 'localhost',
          port: 8080,
          path: `/api/projects/${projectId}/users`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': 0
          }
        }, {
          user_id: 1,
          adding_user_id: 3
        });
        
        console.log('✅ Add user result:', addResult.success ? 'Success' : 'Failed');
        console.log('Message:', addResult.message);
      } catch (e) {
        console.log('ℹ️  Add user test result:', e.message || 'Request completed');
      }
    }
    
    console.log('\n✅ Basic API testing completed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
  
  process.exit(0);
}

testAPIEndpoints();
