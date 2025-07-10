const { executeQuery } = require('./database');
require('dotenv').config();

async function checkUserPasswords() {
    try {
        console.log('🔍 Checking user passwords in database...');
        
        const users = await executeQuery('SELECT UserID, UserName, Password, isAdmin FROM user');
        
        console.log('👥 Users in database:');
        users.forEach(user => {
            console.log(`  ID: ${user.UserID}, Username: ${user.UserName}, Password: "${user.Password}", Admin: ${user.isAdmin}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    process.exit(0);
}

checkUserPasswords();
