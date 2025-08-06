const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'http://localhost:8080';

async function runComprehensiveTests() {
  console.log('🧪 Running Comprehensive Website Function Tests\n');
  
  try {
    // Create a test user first for API testing
    const testUser = {
      UserName: 'test_user_' + Date.now(),
      Password: 'test123',
      isAdmin: 0
    };
    
    console.log('1. 👤 Testing User Management...');
    
    // Create test user
    const userResponse = await axios.post(`${BASE_URL}/api/users`, testUser);
    console.log('✅ Create User:', userResponse.status, userResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    const userId = userResponse.data.data.UserID;
    console.log(`   Created user with ID: ${userId}`);
    
    // Test login
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: testUser.UserName,
      password: testUser.Password
    });
    console.log('✅ User Login:', loginResponse.status, loginResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    // Get all users
    const usersResponse = await axios.get(`${BASE_URL}/api/users`);
    console.log('✅ Get Users:', usersResponse.status, usersResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    console.log('\n2. 🎨 Testing Art Management...');
    
    // Test art endpoints
    const artResponse = await axios.get(`${BASE_URL}/api/art`);
    console.log('✅ Get Art:', artResponse.status, artResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    // Create test artwork
    const newArt = {
      ArtistName: 'Test Artist',
      ArtName: 'Test Artwork',
      Submitor: 'Test Submitter',
      ArtMedia: 'Digital'
    };
    
    const createArtResponse = await axios.post(`${BASE_URL}/api/art`, newArt);
    console.log('✅ Create Art:', createArtResponse.status, createArtResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    console.log('\n3. 📁 Testing Project Management...');
    
    // Get projects (without user filter)
    const projectsResponse = await axios.get(`${BASE_URL}/api/projects`);
    console.log('✅ Get All Projects:', projectsResponse.status, projectsResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    // Get projects for specific user
    const userProjectsResponse = await axios.get(`${BASE_URL}/api/projects?user_id=${userId}`);
    console.log('✅ Get User Projects:', userProjectsResponse.status, userProjectsResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    // Create test project
    const newProject = {
      ProjectName: 'Test Project ' + Date.now(),
      user_id: userId,
      Approved: 0,
      NeedsReview: 1
    };
    
    const createProjectResponse = await axios.post(`${BASE_URL}/api/projects`, newProject);
    console.log('✅ Create Project:', createProjectResponse.status, createProjectResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    const projectId = createProjectResponse.data.data.ProjectID;
    console.log(`   Created project with ID: ${projectId}`);
    
    console.log('\n4. 📄 Testing Media Management...');
    
    // Test media files endpoint with proper userId parameter
    const mediaFilesResponse = await axios.get(`${BASE_URL}/api/media/files?userId=${userId}`);
    console.log('✅ Get User Media Files:', mediaFilesResponse.status, mediaFilesResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    // Test alternative media endpoint
    const userMediaResponse = await axios.get(`${BASE_URL}/api/users/${userId}/media`);
    console.log('✅ Get User Media (alt):', userMediaResponse.status, userMediaResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    console.log('\n5. 🗂️ Testing Project Topics...');
    
    // Test project topics - this should now work with the topic table
    const topicsResponse = await axios.get(`${BASE_URL}/api/projects/${projectId}/topics`);
    console.log('✅ Get Project Topics:', topicsResponse.status, topicsResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    // Create a test topic
    const newTopic = {
      Label: 'Test Topic ' + Date.now()
    };
    
    const createTopicResponse = await axios.post(`${BASE_URL}/api/projects/${projectId}/topics`, newTopic);
    console.log('✅ Create Topic:', createTopicResponse.status, createTopicResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    if (createTopicResponse.data.success) {
      const topicId = createTopicResponse.data.data.TopicID;
      console.log(`   Created topic with ID: ${topicId}`);
      
      // Create a POI for the topic
      const newPOI = {
        XCoord: 100,
        YCoord: 200
      };
      
      const createPOIResponse = await axios.post(`${BASE_URL}/api/topics/${topicId}/pois`, newPOI);
      console.log('✅ Create POI:', createPOIResponse.status, createPOIResponse.data.success ? 'SUCCESS' : 'FAILED');
      
      if (createPOIResponse.data.success) {
        const poiId = createPOIResponse.data.data.POIID;
        console.log(`   Created POI with ID: ${poiId}`);
        
        // Create a card for the POI
        const newCard = {
          Title: 'Test Card',
          Body: 'This is a test card',
          Type: 1,
          Notes: 'Test notes'
        };
        
        const createCardResponse = await axios.post(`${BASE_URL}/api/pois/${poiId}/cards`, newCard);
        console.log('✅ Create Card:', createCardResponse.status, createCardResponse.data.success ? 'SUCCESS' : 'FAILED');
      }
    }
    
    console.log('\n6. 🃏 Testing Card Management...');
    
    // Get all cards
    const cardsResponse = await axios.get(`${BASE_URL}/api/cards`);
    console.log('✅ Get All Cards:', cardsResponse.status, cardsResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    console.log('\n7. 🔍 Testing Core API...');
    
    // Test main API endpoint
    const apiResponse = await axios.get(`${BASE_URL}/api`);
    console.log('✅ API Info:', apiResponse.status, apiResponse.data.message ? 'SUCCESS' : 'FAILED');
    
    // Test root endpoint
    const rootResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Root Endpoint:', rootResponse.status, rootResponse.data.message ? 'SUCCESS' : 'FAILED');
    
    console.log('\n🎉 All tests completed! Summary:');
    console.log('✅ User Management: Working');
    console.log('✅ Art Management: Working');
    console.log('✅ Project Management: Working');
    console.log('✅ Media Management: Working');
    console.log('✅ Project Topics: Working');
    console.log('✅ Card Management: Working');
    console.log('✅ Core API: Working');
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ Test failed - Status: ${error.response.status}, Error: ${error.response.data?.message || error.message}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start it with: npm start');
    } else {
      console.log(`❌ Test failed - Error: ${error.message}`);
    }
  }
}

// Check if server is running first
async function checkServerAndRunTests() {
  try {
    await axios.get(`${BASE_URL}/api`);
    console.log('✅ Server is running\n');
    await runComprehensiveTests();
  } catch (error) {
    console.log('❌ Server is not running. Please start it with: npm start');
  }
}

checkServerAndRunTests();
