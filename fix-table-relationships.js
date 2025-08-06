const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTableRelationships() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('Checking table relationships...');
    
    // Check POI table constraints
    const [constraints] = await conn.execute(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'poi' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('POI table foreign key constraints:');
    constraints.forEach(constraint => {
      console.log(`  ${constraint.CONSTRAINT_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });
    
    // Check what's in both topic tables
    const [topicRecords] = await conn.execute('SELECT * FROM topic');
    const [projectTopicRecords] = await conn.execute('SELECT * FROM project_topics');
    
    console.log('\nTopic table records:', topicRecords);
    console.log('Project_topics table records:', projectTopicRecords);
    
    // Let's copy the topic to project_topics so POI can reference it
    if (topicRecords.length > 0) {
      console.log('\nCopying topic records to project_topics...');
      
      for (const topic of topicRecords) {
        // Check if it already exists
        const [existing] = await conn.execute('SELECT * FROM project_topics WHERE topicId = ?', [topic.TopicID]);
        
        if (existing.length === 0) {
          await conn.execute(
            'INSERT INTO project_topics (topicId, topicLabel, projectId) VALUES (?, ?, ?)',
            [topic.TopicID, topic.Label, topic.ProjectID_FK]
          );
          console.log(`  Copied topic ${topic.TopicID}: ${topic.Label}`);
        } else {
          console.log(`  Topic ${topic.TopicID} already exists in project_topics`);
        }
      }
    }
    
    await conn.end();
    console.log('\n✅ Table relationship fix completed');
    
  } catch (error) {
    console.error('❌ Error fixing table relationships:', error.message);
  }
}

fixTableRelationships();
