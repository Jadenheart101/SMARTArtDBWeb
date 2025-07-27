const { executeQuery } = require('./database.js');

async function createProjectUsersTable() {
  try {
    console.log('🔧 Creating project_users table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('owner', 'editor') DEFAULT 'editor',
        added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        added_by INT,
        
        UNIQUE KEY unique_project_user (project_id, user_id),
        INDEX idx_project_id (project_id),
        INDEX idx_user_id (user_id),
        
        FOREIGN KEY (project_id) REFERENCES project(ProjectID) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES user(UserID) ON DELETE SET NULL
      )
    `;
    
    await executeQuery(createTableSQL);
    console.log('✅ project_users table created successfully!');
    
    // Check if table exists and has data
    const tableCheck = await executeQuery('SHOW TABLES LIKE "project_users"');
    console.log('📋 Table exists:', tableCheck.length > 0);
    
    // Migrate existing projects
    console.log('🔄 Migrating existing projects...');
    const migrateSQL = `
      INSERT IGNORE INTO project_users (project_id, user_id, role, added_by)
      SELECT ProjectID, user_id, 'owner', user_id 
      FROM project
    `;
    
    const result = await executeQuery(migrateSQL);
    console.log(`✅ Migrated ${result.affectedRows} existing projects to new system`);
    
    // Verify the migration
    const count = await executeQuery('SELECT COUNT(*) as count FROM project_users');
    console.log(`📊 Total project-user associations: ${count[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

createProjectUsersTable();
