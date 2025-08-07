require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  
  console.log('✅ Connected to database');
  
  // Get admin users
  const query = `SELECT UserID, UserName, isAdmin FROM user WHERE isAdmin = 1`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Query error:', err);
      return;
    }
    
    console.log('👑 Admin users found:');
    console.table(results);
    
    db.end();
  });
});
