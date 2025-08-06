const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Setting up Azure MySQL database...\n');
  
  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000,
      multipleStatements: true // Allow multiple SQL statements
    });

    console.log('✅ Connected to Azure MySQL database');
    
    // Read and execute the setup SQL file
    const sqlFilePath = path.join(__dirname, 'azure-mysql-setup.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Executing database setup script...');
    
    // Split SQL content into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let tablesCreated = 0;
    let dataInserted = 0;
    
    for (const statement of statements) {
      try {
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          const [results] = await connection.execute(statement + ';');
          const tableName = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)?.[1];
          console.log(`✅ Created table: ${tableName}`);
          tablesCreated++;
        } else if (statement.toUpperCase().includes('INSERT')) {
          const [results] = await connection.execute(statement + ';');
          if (results.affectedRows > 0) {
            dataInserted += results.affectedRows;
          }
        } else if (statement.toUpperCase().includes('SELECT') || 
                   statement.toUpperCase().includes('SHOW')) {
          const [results] = await connection.execute(statement + ';');
          if (Array.isArray(results) && results.length > 0) {
            console.log('\n📋 Database tables:');
            results.forEach(row => {
              const tableName = row[Object.keys(row)[0]];
              console.log(`  - ${tableName}`);
            });
          }
        }
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`⚠️  Warning executing statement: ${error.message}`);
        }
      }
    }
    
    console.log(`\n🎉 Database setup completed!`);
    console.log(`📊 Tables created: ${tablesCreated}`);
    console.log(`📝 Sample records inserted: ${dataInserted}`);
    
    // Verify setup by checking tables
    console.log('\n🔍 Verifying database setup...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    if (tables.length > 0) {
      console.log('✅ Database setup successful!');
      console.log('\n📋 Created tables:');
      tables.forEach(table => {
        const tableName = table[`Tables_in_${process.env.DB_NAME}`];
        console.log(`  ✅ ${tableName}`);
      });
      
      // Show sample data counts
      console.log('\n📊 Sample data counts:');
      const sampleTables = ['user', 'art', 'project', 'project_topics', 'poi', 'card'];
      
      for (const tableName of sampleTables) {
        try {
          const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`  ${tableName}: ${countResult[0].count} records`);
        } catch (error) {
          // Table might not exist, skip
        }
      }
      
    } else {
      console.log('❌ No tables found after setup');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

setupDatabase().then(() => {
  console.log('\n🚀 Your application is ready to use!');
  console.log('💡 You can now start your server with: npm start');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Setup failed:', error.message);
  process.exit(1);
});
