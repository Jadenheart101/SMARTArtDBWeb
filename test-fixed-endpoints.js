// Test script to verify the fixed API endpoints
async function testFixedEndpoints() {
    const API_BASE_URL = 'http://localhost:8080/api';
    
    console.log('🧪 Testing fixed API endpoints...\n');
    
    // Test 1: GET /api/media/file/4
    console.log('🔬 Test 1: GET /api/media/file/4');
    try {
        const response = await fetch(`${API_BASE_URL}/media/file/4`);
        console.log('   Status:', response.status);
        const result = await response.json();
        console.log('   Result:', result.success ? 'SUCCESS' : 'FAILED');
        if (result.success) {
            console.log('   File:', result.file.name);
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    // Test 2: GET /api/art/media/4 (numeric ID)
    console.log('\n🔬 Test 2: GET /api/art/media/4 (numeric ID)');
    try {
        const response = await fetch(`${API_BASE_URL}/art/media/4`);
        console.log('   Status:', response.status);
        const result = await response.json();
        console.log('   Result:', result.success ? 'SUCCESS' : 'FAILED');
        if (result.success) {
            console.log('   Art:', result.data.ArtName, 'by', result.data.ArtistName);
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    // Test 3: GET /api/art/media/1754743997357_qsutbgg.jpg (filename)
    console.log('\n🔬 Test 3: GET /api/art/media/1754743997357_qsutbgg.jpg (filename)');
    try {
        const response = await fetch(`${API_BASE_URL}/art/media/1754743997357_qsutbgg.jpg`);
        console.log('   Status:', response.status);
        const result = await response.json();
        console.log('   Result:', result.success ? 'SUCCESS' : 'FAILED');
        if (result.success) {
            console.log('   Art:', result.data.ArtName, 'by', result.data.ArtistName);
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    // Test 4: POST /api/art (create new art info)
    console.log('\n🔬 Test 4: POST /api/art (create new art info)');
    try {
        const postData = {
            ArtistName: 'Test Artist',
            ArtName: 'Test Artwork',
            ArtMedia: 'Digital',
            Submitor: 'test user',
            Date: '2025-08-09',
            artcol: 4
        };
        
        const response = await fetch(`${API_BASE_URL}/art`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        console.log('   Status:', response.status);
        const result = await response.json();
        console.log('   Result:', result.success ? 'SUCCESS' : 'FAILED');
        if (result.success) {
            console.log('   Created art ID:', result.data.ArtId);
        } else {
            console.log('   Error:', result.message);
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    console.log('\n✅ All tests completed!');
}

testFixedEndpoints();
