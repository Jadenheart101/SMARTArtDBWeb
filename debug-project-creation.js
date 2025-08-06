// Debug project creation by checking database schema
async function debugProjectCreation() {
    console.log('🔍 Debugging Project Creation');
    
    try {
        // Check if the projects endpoint exists and is working
        console.log('Testing GET /api/projects endpoint...');
        const getResponse = await fetch('http://localhost:8080/api/projects');
        const getResult = await getResponse.json();
        console.log('GET projects response:', getResult);
        
        // Now try creating a project with minimal data
        console.log('\nTesting minimal project creation...');
        const minimalData = {
            ProjectName: 'Simple Test Project',
            user_id: 1  // Use a simple user ID
        };
        
        console.log('Sending minimal project data:', minimalData);
        
        const response = await fetch('http://localhost:8080/api/projects', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(minimalData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response text:', errorText);
            return;
        }
        
        const result = await response.json();
        console.log('Success response:', result);
        
    } catch (error) {
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

debugProjectCreation();
