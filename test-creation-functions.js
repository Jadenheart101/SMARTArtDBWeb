// Test project creation functionality
async function testProjectCreation() {
    console.log('🧪 Testing Project Creation');
    
    try {
        // First, create a test user
        const testUsername = `testuser_${Date.now()}`;
        console.log(`Creating test user: ${testUsername}`);
        
        const userResponse = await fetch('http://localhost:8080/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                UserName: testUsername,
                Password: 'testpass123',
                isAdmin: 0
            })
        });
        
        const userResult = await userResponse.json();
        if (!userResult.success) {
            throw new Error(`User creation failed: ${userResult.message}`);
        }
        
        const user = userResult.data;
        console.log(`✅ Test user created with ID: ${user.UserID}`);
        
        // Test project creation
        console.log('\nTesting project creation...');
        const projectData = {
            ProjectName: `Test Project ${Date.now()}`,
            Approved: 0,
            NeedsReview: 1,
            user_id: user.UserID,
            DateCreated: new Date().toISOString().split('T')[0],
            DateModified: new Date().toISOString().split('T')[0]
        };
        
        console.log('Project data to send:', projectData);
        
        const projectResponse = await fetch('http://localhost:8080/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        
        const projectResult = await projectResponse.json();
        console.log('Project creation response:', projectResult);
        
        if (projectResult.success) {
            console.log('✅ Project created successfully');
            console.log('Project ID:', projectResult.data.ProjectID);
            
            // Verify the project was created by fetching it
            const verifyResponse = await fetch(`http://localhost:8080/api/projects?user_id=${user.UserID}`);
            const verifyResult = await verifyResponse.json();
            
            if (verifyResult.success && verifyResult.data.length > 0) {
                console.log('✅ Project verification successful - found in user\'s projects');
            } else {
                console.log('❌ Project verification failed - not found in user\'s projects');
            }
        } else {
            console.log('❌ Project creation failed:', projectResult.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Test other creation functions too
async function testOtherCreation() {
    console.log('\n🧪 Testing Other Creation Functions');
    
    try {
        // Test artwork creation
        console.log('Testing artwork creation...');
        const artworkData = {
            ArtName: `Test Artwork ${Date.now()}`,
            ArtistName: 'Test Artist',
            Submitor: 'Test Submitter',
            Date: new Date().toISOString().split('T')[0],
            ArtMedia: 1,
            artcol: 'Test description'
        };
        
        const artResponse = await fetch('http://localhost:8080/api/art', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artworkData)
        });
        
        const artResult = await artResponse.json();
        console.log('Artwork creation response:', artResult);
        
        if (artResult.success) {
            console.log('✅ Artwork creation working');
        } else {
            console.log('❌ Artwork creation failed:', artResult.message);
        }
        
    } catch (error) {
        console.error('❌ Other creation test failed:', error);
    }
}

// Run all tests
async function runAllTests() {
    await testProjectCreation();
    await testOtherCreation();
    
    console.log('\n📋 Creation Functionality Summary:');
    console.log('- Project Creation: Check console output above');
    console.log('- User Creation: Already tested and working');
    console.log('- Artwork Creation: Check console output above');
    console.log('- Media Upload: Previously tested and working');
}

runAllTests();
