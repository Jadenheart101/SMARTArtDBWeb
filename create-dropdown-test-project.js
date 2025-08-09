const axios = require('axios');

async function createTestProjectWithContent() {
    try {
        console.log('🧪 Creating test project with dropdown content...\n');
        
        // Step 1: Create a test project
        console.log('1. Creating test project...');
        const projectResponse = await axios.post('http://localhost:8080/api/projects', {
            ProjectName: 'Dropdown Test Project',
            Description: 'A project to test the new dropdown functionality in view mode',
            userId: 1
        });
        
        const projectId = projectResponse.data.data.ProjectID;
        console.log('   ✅ Project created with ID:', projectId);
        
        // Step 2: Create topics
        console.log('\n2. Creating topics...');
        const topicResponses = await Promise.all([
            axios.post(`http://localhost:8080/api/projects/${projectId}/topics`, {
                topic_title: 'Architecture & Design',
                topic_content: 'Information about building architecture and design elements'
            }),
            axios.post(`http://localhost:8080/api/projects/${projectId}/topics`, {
                topic_title: 'Historical Context',
                topic_content: 'Historical background and timeline information'
            })
        ]);
        
        const topic1Id = topicResponses[0].data.data.TopicID;
        const topic2Id = topicResponses[1].data.data.TopicID;
        console.log('   ✅ Topics created:', topic1Id, topic2Id);
        
        // Step 3: Create POIs for each topic
        console.log('\n3. Creating POIs...');
        const poiResponses = await Promise.all([
            // POIs for Topic 1
            axios.post(`http://localhost:8080/api/topics/${topic1Id}/pois`, {
                x_coordinate: 100,
                y_coordinate: 150,
                pLocation: 'Main entrance featuring Gothic Revival architecture with ornate stone carvings and twin spires'
            }),
            axios.post(`http://localhost:8080/api/topics/${topic1Id}/pois`, {
                x_coordinate: 250,
                y_coordinate: 200,
                pLocation: 'Interior nave showcasing ribbed vaulting and stained glass windows from the 14th century'
            }),
            // POIs for Topic 2
            axios.post(`http://localhost:8080/api/topics/${topic2Id}/pois`, {
                x_coordinate: 300,
                y_coordinate: 100,
                pLocation: 'Foundation stones dating back to 1205, marking the original construction period'
            })
        ]);
        
        const poi1Id = poiResponses[0].data.data.POIID;
        const poi2Id = poiResponses[1].data.data.POIID;
        const poi3Id = poiResponses[2].data.data.POIID;
        console.log('   ✅ POIs created:', poi1Id, poi2Id, poi3Id);
        
        // Step 4: Create cards for each POI
        console.log('\n4. Creating cards...');
        const cardResponses = await Promise.all([
            // Cards for POI 1
            axios.post(`http://localhost:8080/api/pois/${poi1Id}/cards`, {
                Title: 'Architectural Style Analysis',
                Body: 'The Gothic Revival style is evident in the pointed arches, flying buttresses, and vertical emphasis. The facade demonstrates typical 19th-century interpretation of medieval Gothic principles.',
                Type: 1,
                Notes: 'Compare with original Gothic cathedrals for authenticity assessment',
                References: 'Gothic Architecture by Paul Frankl, Chapter 12'
            }),
            axios.post(`http://localhost:8080/api/pois/${poi1Id}/cards`, {
                Title: 'Construction Materials',
                Body: 'Local limestone quarried from nearby hills provides the primary building material. Iron reinforcement was added during 1890s renovations.',
                Type: 2,
                Notes: 'Sample analysis pending from geology department',
                References: 'Building Materials Survey Report 2023'
            }),
            // Cards for POI 2
            axios.post(`http://localhost:8080/api/pois/${poi2Id}/cards`, {
                Title: 'Stained Glass Windows',
                Body: 'The rose window depicts scenes from the life of St. Francis, created by master glazier Johann Mueller in 1878. The technique shows influences from both French and German traditions.',
                Type: 3,
                Notes: 'UV damage assessment scheduled for next month',
                References: 'European Stained Glass Traditions, Volume 2'
            }),
            // Cards for POI 3
            axios.post(`http://localhost:8080/api/pois/${poi3Id}/cards`, {
                Title: 'Foundation History',
                Body: 'Archaeological excavations in 1995 revealed evidence of three distinct building phases: original Norman foundation (1205), Gothic expansion (1350), and Victorian restoration (1885).',
                Type: 1,
                Notes: 'Detailed archaeological report available in project archives',
                References: 'Medieval Building Techniques by Sarah Thompson'
            })
        ]);
        
        console.log('   ✅ Cards created:', cardResponses.length, 'cards total');
        
        console.log('\n✅ Test project with dropdown content created successfully!');
        console.log('📋 Project ID:', projectId);
        console.log('📝 Topics: Architecture & Design, Historical Context');
        console.log('📍 POIs: 3 total with detailed locations');
        console.log('📄 Cards: 4 total with content, notes, and references');
        console.log('\n🎯 Open the project in View mode to see the new dropdown functionality!');
        
    } catch (error) {
        console.error('\n❌ Test creation failed:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        } else {
            console.error('   Error:', error.message);
        }
    }
}

createTestProjectWithContent();
