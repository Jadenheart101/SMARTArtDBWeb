const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // SSL configuration for Azure MySQL (required)
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('.mysql.database.azure.com') ? {
    rejectUnauthorized: false
  } : false,
  connectTimeout: 60000
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    
    // DEBUG: On server start, log some basic database information
    setTimeout(async () => {
      try {
        console.log('\n🔍 === DATABASE DEBUG INFO ON STARTUP ===');
        
        const projectCount = await executeQuery('SELECT COUNT(*) as count FROM project');
        console.log('📊 Total projects in database:', projectCount[0].count);
        
        if (projectCount[0].count > 0) {
          const sampleProjects = await executeQuery('SELECT ProjectID, ProjectName, Description, DateCreated FROM project LIMIT 3');
          console.log('📋 Sample projects:');
          sampleProjects.forEach(p => {
            console.log(`  - ID ${p.ProjectID}: "${p.ProjectName}" (Description: ${p.Description ? '"' + p.Description.substring(0, 50) + '..."' : 'NULL'})`);
          });
        }
        
        const topicCount = await executeQuery('SELECT COUNT(*) as count FROM project_topics');
        console.log('📝 Total topics in database:', topicCount[0].count);
        
        const poiCount = await executeQuery('SELECT COUNT(*) as count FROM poi');
        console.log('📍 Total POIs in database:', poiCount[0].count);
        
        const cardCount = await executeQuery('SELECT COUNT(*) as count FROM card');
        console.log('📄 Total cards in database:', cardCount[0].count);
        
        const artCount = await executeQuery('SELECT COUNT(*) as count FROM art');
        console.log('🎨 Total art records in database:', artCount[0].count);
        
        console.log('===========================================\n');
      } catch (error) {
        console.error('❌ Error during database debug:', error);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Execute query function
async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// Close connection pool
async function closePool() {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  closePool
};
