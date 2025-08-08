import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_HOST && process.env.DB_HOST.includes('.mysql.database.azure.com') ? {
        rejectUnauthorized: false
    } : false,
    connectTimeout: 60000
};

const pool = mysql.createPool(dbConfig);

async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

async function getNextAvailableId(tableName, idColumn) {
    try {
        const existingIds = await executeQuery(
            `SELECT ${idColumn} FROM ${tableName} WHERE ${idColumn} > 0 ORDER BY ${idColumn}`
        );
        
        if (existingIds.length === 0) {
            return 1;
        }
        
        let expectedId = 1;
        for (const row of existingIds) {
            const currentId = row[idColumn];
            if (currentId !== expectedId) {
                return expectedId;
            }
            expectedId++;
        }
        
        return expectedId;
    } catch (error) {
        console.error('Error getting next available ID:', error);
        throw error;
    }
}

async function testIdManagement() {
    console.log('🔍 Testing ID Management Across All Tables...\n');
    
    try {
        // Test 1: Check current state of all tables
        console.log('📊 Current ID state of all tables:');
        
        const tables = [
            { name: 'user', idColumn: 'UserID' },
            { name: 'project', idColumn: 'ProjectID' },
            { name: 'media_files', idColumn: 'id' },
            { name: 'art', idColumn: 'ArtId' },
            { name: 'project_topics', idColumn: 'id' }
        ];
        
        for (const table of tables) {
            try {
                const existingIds = await executeQuery(
                    `SELECT ${table.idColumn} FROM ${table.name} ORDER BY ${table.idColumn}`
                );
                
                const ids = existingIds.map(row => row[table.idColumn]);
                const nextId = await getNextAvailableId(table.name, table.idColumn);
                
                console.log(`  ${table.name}.${table.idColumn}: [${ids.join(', ')}] → Next: ${nextId}`);
                
                // Check for gaps
                const gaps = [];
                for (let i = 1; i < Math.max(...ids, 0); i++) {
                    if (!ids.includes(i)) {
                        gaps.push(i);
                    }
                }
                
                if (gaps.length > 0) {
                    console.log(`    🔍 Gaps found: [${gaps.join(', ')}]`);
                    if (nextId !== gaps[0]) {
                        console.log(`    ❌ ERROR: Next ID should be ${gaps[0]} but getNextAvailableId returned ${nextId}`);
                    } else {
                        console.log(`    ✅ Correctly identifies first gap: ${nextId}`);
                    }
                } else {
                    console.log(`    ✅ No gaps - sequential numbering`);
                }
                
            } catch (error) {
                console.log(`  ${table.name}.${table.idColumn}: ❌ Error - ${error.message}`);
            }
        }
        
        // Test 2: Test gap filling by creating artificial gaps
        console.log('\n🧪 Testing gap filling with artificial scenarios:');
        
        // Test user table gap filling
        console.log('\n👤 Testing User ID Management:');
        const userIds = await executeQuery('SELECT UserID FROM user ORDER BY UserID');
        const currentUserIds = userIds.map(row => row.UserID);
        console.log(`Current user IDs: [${currentUserIds.join(', ')}]`);
        
        // If we have sequential IDs (1,2), delete ID 2 to create a gap
        if (currentUserIds.includes(2) && currentUserIds.length >= 2) {
            console.log('Creating gap by deleting user ID 2...');
            await executeQuery('DELETE FROM user WHERE UserID = 2');
            
            const nextUserId = await getNextAvailableId('user', 'UserID');
            console.log(`After deleting ID 2, next available ID: ${nextUserId}`);
            
            if (nextUserId === 2) {
                console.log('✅ PASS: Correctly identified gap at ID 2');
            } else {
                console.log(`❌ FAIL: Expected ID 2, got ${nextUserId}`);
            }
            
            // Restore the user for further testing
            await executeQuery(
                'INSERT INTO user (UserID, UserName, Password, isAdmin) VALUES (?, ?, ?, ?)',
                [2, 'test_user_restored', 'password123', 0]
            );
            console.log('Restored user ID 2 for consistency');
        }
        
        // Test 3: Check AUTO_INCREMENT behavior for media_files
        console.log('\n📷 Testing Media Files AUTO_INCREMENT:');
        
        // Check current media_files IDs
        const mediaIds = await executeQuery('SELECT id FROM media_files ORDER BY id');
        const currentMediaIds = mediaIds.map(row => row.id);
        console.log(`Current media file IDs: [${currentMediaIds.join(', ')}]`);
        
        // Check AUTO_INCREMENT status
        try {
            const autoIncResult = await executeQuery(
                "SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'media_files'",
                [process.env.DB_NAME]
            );
            
            if (autoIncResult.length > 0) {
                console.log(`AUTO_INCREMENT value: ${autoIncResult[0].AUTO_INCREMENT}`);
                
                if (currentMediaIds.length > 0) {
                    const maxId = Math.max(...currentMediaIds);
                    const expectedAutoInc = maxId + 1;
                    
                    if (autoIncResult[0].AUTO_INCREMENT === expectedAutoInc) {
                        console.log('✅ AUTO_INCREMENT is correctly set to next sequential value');
                    } else {
                        console.log(`⚠️ AUTO_INCREMENT (${autoIncResult[0].AUTO_INCREMENT}) doesn't match expected (${expectedAutoInc})`);
                        console.log('  Note: AUTO_INCREMENT doesn\'t fill gaps - this is normal MySQL behavior');
                    }
                }
            }
        } catch (error) {
            console.log('Could not check AUTO_INCREMENT status:', error.message);
        }
        
        console.log('\n📋 Summary:');
        console.log('  - Tables using getNextAvailableId (gap-filling): user, project, art, project_topics');
        console.log('  - Tables using AUTO_INCREMENT (no gap-filling): media_files');
        console.log('  - Gap-filling tables will reuse deleted IDs');
        console.log('  - AUTO_INCREMENT tables will continue with next highest number');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testIdManagement().catch(console.error);
