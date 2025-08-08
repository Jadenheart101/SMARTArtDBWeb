import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration (matching the main app)
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

async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

async function cleanupNonAdminUsers() {
    console.log('🧹 Starting cleanup of non-admin users and their data...\n');
    
    try {
        // 1. Get all users first
        console.log('📋 Fetching all users...');
        const allUsers = await executeQuery('SELECT UserID, UserName, isAdmin FROM user ORDER BY UserID');
        
        console.log('👥 Current users in database:');
        allUsers.forEach(user => {
            console.log(`  - ${user.UserName} (ID: ${user.UserID}) - ${user.isAdmin ? 'ADMIN' : 'USER'}`);
        });
        
        // 2. Identify non-admin users
        const nonAdminUsers = allUsers.filter(user => !user.isAdmin);
        const adminUsers = allUsers.filter(user => user.isAdmin);
        
        console.log(`\n🔍 Found ${adminUsers.length} admin(s) and ${nonAdminUsers.length} regular user(s)`);
        
        if (nonAdminUsers.length === 0) {
            console.log('✅ No non-admin users to delete. Database is already clean.');
            return;
        }
        
        console.log('\n🗑️ Will delete the following users and their data:');
        nonAdminUsers.forEach(user => {
            console.log(`  - ${user.UserName} (ID: ${user.UserID})`);
        });
        
        console.log('\n✅ Will preserve the following admin users:');
        adminUsers.forEach(user => {
            console.log(`  - ${user.UserName} (ID: ${user.UserID})`);
        });
        
        // 3. For each non-admin user, delete their associated data
        for (const user of nonAdminUsers) {
            console.log(`\n🔄 Processing user: ${user.UserName} (ID: ${user.UserID})`);
            
            // 3a. Get user's projects
            const userProjects = await executeQuery(
                'SELECT ProjectID, ProjectName, image_id FROM project WHERE user_id = ?',
                [user.UserID]
            );
            
            console.log(`  📁 Found ${userProjects.length} project(s) for user ${user.UserName}`);
            
            // 3b. Delete user's projects
            if (userProjects.length > 0) {
                for (const project of userProjects) {
                    console.log(`    🗑️ Deleting project: "${project.ProjectName}" (ID: ${project.ProjectID})`);
                }
                
                const deleteProjectsResult = await executeQuery(
                    'DELETE FROM project WHERE user_id = ?',
                    [user.UserID]
                );
                console.log(`    ✅ Deleted ${deleteProjectsResult.affectedRows} project(s)`);
            }
            
            // 3c. Get user's media files
            const userMedia = await executeQuery(
                'SELECT id, file_name, file_path FROM media_files WHERE user_id = ?',
                [user.UserID]
            );
            
            console.log(`  📷 Found ${userMedia.length} media file(s) for user ${user.UserName}`);
            
            // 3d. Delete physical media files
            if (userMedia.length > 0) {
                for (const media of userMedia) {
                    const filePath = path.join(__dirname, media.file_path);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`    🗑️ Deleted file: ${media.file_name}`);
                        } catch (error) {
                            console.warn(`    ⚠️ Could not delete file ${media.file_name}: ${error.message}`);
                        }
                    } else {
                        console.log(`    ℹ️ File not found (already deleted): ${media.file_name}`);
                    }
                }
                
                // 3e. Delete media records from database
                const deleteMediaResult = await executeQuery(
                    'DELETE FROM media_files WHERE user_id = ?',
                    [user.UserID]
                );
                console.log(`    ✅ Deleted ${deleteMediaResult.affectedRows} media record(s) from database`);
            }
            
            // 3f. Delete user record
            const deleteUserResult = await executeQuery(
                'DELETE FROM user WHERE UserID = ?',
                [user.UserID]
            );
            console.log(`  ✅ Deleted user ${user.UserName} from database`);
        }
        
        // 4. Final verification
        console.log('\n🔍 Final verification...');
        const remainingUsers = await executeQuery('SELECT UserID, UserName, isAdmin FROM user ORDER BY UserID');
        
        console.log('👥 Remaining users in database:');
        remainingUsers.forEach(user => {
            console.log(`  - ${user.UserName} (ID: ${user.UserID}) - ${user.isAdmin ? 'ADMIN' : 'USER'}`);
        });
        
        // 5. Check for empty upload directories
        console.log('\n📁 Checking upload directories...');
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            const uploadDirContents = fs.readdirSync(uploadsDir, { withFileTypes: true });
            const userDirs = uploadDirContents.filter(item => item.isDirectory() && item.name.startsWith('user_'));
            
            console.log(`Found ${userDirs.length} user upload directories`);
            
            // Clean up empty user directories
            for (const userDir of userDirs) {
                const userDirPath = path.join(uploadsDir, userDir.name);
                const imagesDir = path.join(userDirPath, 'images');
                
                if (fs.existsSync(imagesDir)) {
                    const imageFiles = fs.readdirSync(imagesDir);
                    if (imageFiles.length === 0) {
                        console.log(`  🗑️ Removing empty images directory: ${userDir.name}/images`);
                        fs.rmdirSync(imagesDir);
                        
                        // Remove user directory if now empty
                        const userDirContents = fs.readdirSync(userDirPath);
                        if (userDirContents.length === 0) {
                            console.log(`  🗑️ Removing empty user directory: ${userDir.name}`);
                            fs.rmdirSync(userDirPath);
                        }
                    } else {
                        console.log(`  📁 Directory ${userDir.name}/images contains ${imageFiles.length} file(s)`);
                    }
                }
            }
        }
        
        console.log('\n🎉 Cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        // Close the database pool
        await pool.end();
    }
}

// Run the cleanup
cleanupNonAdminUsers().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
