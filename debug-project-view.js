// Debug script to test project view data completeness
const http = require('http');

// Function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function debugProjectView() {
  console.log('🔍 === PROJECT VIEW DATA COMPLETENESS DEBUG ===\n');

  try {
    // First, get list of projects
    console.log('📋 1. Getting list of projects...');
    const projectsResponse = await makeRequest('/api/projects');
    console.log('Projects API response:', JSON.stringify(projectsResponse, null, 2));
    
    if (!projectsResponse.success || !projectsResponse.data || projectsResponse.data.length === 0) {
      console.log('❌ No projects found or API error');
      return;
    }

    // Test the first project
    const firstProject = projectsResponse.data[0];
    const projectId = firstProject.ProjectID;
    console.log(`\n📊 2. Testing project view for Project ID: ${projectId} ("${firstProject.ProjectName}")`);
    
    // Get detailed project information
    console.log('\n🔍 2a. Getting project details...');
    const projectResponse = await makeRequest(`/api/projects/${projectId}`);
    console.log('Project Details Response:', JSON.stringify(projectResponse, null, 2));
    
    if (projectResponse.success && projectResponse.data) {
      const project = projectResponse.data;
      console.log('\n📋 Project Information Analysis:');
      console.log(`  ✅ ProjectName: ${project.ProjectName || 'MISSING'}`);
      console.log(`  ✅ Description: ${project.Description || 'MISSING/NULL'}`);
      console.log(`  ✅ DateCreated: ${project.DateCreated || 'MISSING'}`);
      console.log(`  ✅ DateModified: ${project.DateModified || 'MISSING'}`);
      console.log(`  ✅ Status (Approved): ${project.Approved !== undefined ? project.Approved : 'MISSING'}`);
      console.log(`  ✅ Status (NeedsReview): ${project.NeedsReview !== undefined ? project.NeedsReview : 'MISSING'}`);
      console.log(`  🖼️ ImageURL: ${project.ImageURL || 'MISSING/NULL'}`);
      console.log(`  🖼️ ImageName: ${project.ImageName || 'MISSING/NULL'}`);
    }

    // Get project topics
    console.log('\n🔍 2b. Getting project topics...');
    const topicsResponse = await makeRequest(`/api/projects/${projectId}/topics`);
    console.log('Topics Response:', JSON.stringify(topicsResponse, null, 2));
    
    if (topicsResponse.success && topicsResponse.data) {
      console.log(`\n📋 Topics Analysis (${topicsResponse.data.length} topics found):`);
      topicsResponse.data.forEach((topic, index) => {
        console.log(`  📝 Topic ${index + 1}: "${topic.Label || topic.topic_title}" (ID: ${topic.TopicID})`);
        if (topic.pois && topic.pois.length > 0) {
          console.log(`    📍 POIs: ${topic.pois.length} found`);
          topic.pois.forEach((poi, poiIndex) => {
            console.log(`      POI ${poiIndex + 1}: ID ${poi.POIID}`);
            console.log(`        📍 Location: ${poi.pLocation || 'No location'}`);
            console.log(`        🖼️ Image: ${poi.pImage || 'No image'}`);
            if (poi.cards && poi.cards.length > 0) {
              console.log(`        📄 Cards: ${poi.cards.length} found`);
              poi.cards.forEach((card, cardIndex) => {
                console.log(`          Card ${cardIndex + 1}: "${card.Title}" (ID: ${card.CardID})`);
                console.log(`            📝 Body: ${card.Body ? 'Has content' : 'No content'}`);
                console.log(`            📝 Notes: ${card.Notes ? 'Has notes' : 'No notes'}`);
                console.log(`            📚 References: ${card.References ? 'Has references' : 'No references'}`);
                console.log(`            🖼️ Media: ${card.media ? card.media.length : 0} files`);
              });
            } else {
              console.log(`        📄 Cards: None`);
            }
          });
        } else {
          console.log(`    📍 POIs: None`);
        }
      });
    }

    // Check art information if there's an image
    if (projectResponse.success && projectResponse.data && projectResponse.data.ImageURL) {
      console.log('\n🔍 2c. Checking art information...');
      // Extract filename from ImageURL
      const imageUrl = projectResponse.data.ImageURL;
      const filename = imageUrl.split('/').pop();
      console.log(`  🖼️ Image filename: ${filename}`);
      
      const artResponse = await makeRequest(`/api/art/media/${encodeURIComponent(filename)}`);
      console.log('Art Info Response:', JSON.stringify(artResponse, null, 2));
      
      if (artResponse.success && artResponse.data) {
        const art = artResponse.data;
        console.log('\n🎨 Art Information Analysis:');
        console.log(`  ✅ ArtistName: ${art.ArtistName || 'MISSING'}`);
        console.log(`  ✅ ArtName: ${art.ArtName || 'MISSING'}`);
        console.log(`  ✅ ArtMedia: ${art.ArtMedia || 'MISSING'}`);
        console.log(`  ✅ Submitor: ${art.Submitor || 'MISSING'}`);
        console.log(`  ✅ Date: ${art.Date || 'MISSING'}`);
      } else {
        console.log('  ❌ No art information found for this image');
      }
    }

    console.log('\n📊 === SUMMARY ===');
    console.log('This debug shows all data that SHOULD be visible in the project view.');
    console.log('If something is missing from the UI but present here, it\'s a frontend display issue.');
    console.log('If something is missing from this data, it\'s a backend/database issue.');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug
debugProjectView();
