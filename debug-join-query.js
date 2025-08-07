const { executeQuery } = require('./database.js');

async function checkUserTable() {
    try {
        console.log('Checking users table...');
        const users = await executeQuery('SELECT * FROM user LIMIT 10');
        console.log('Users found:', users.length);
        if (users.length > 0) {
            console.table(users);
        }
        
        console.log('\nChecking media_files table...');
        const media = await executeQuery('SELECT * FROM media_files LIMIT 10');
        console.log('Media files found:', media.length);
        if (media.length > 0) {
            console.table(media);
        }
        
        console.log('\nTesting the JOIN query...');
        const joinResult = await executeQuery(`
            SELECT 
                mf.*,
                u.UserName as owner_name
            FROM media_files mf
            LEFT JOIN user u ON mf.user_id = u.UserID
            ORDER BY mf.created_at DESC
        `);
        console.log('JOIN query result:', joinResult.length);
        if (joinResult.length > 0) {
            console.table(joinResult);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Debug error:', error);
        process.exit(1);
    }
}

checkUserTable();
