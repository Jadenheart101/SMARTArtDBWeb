import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Delete the orphaned file that should have been cleaned up
const orphanedFile = path.join(__dirname, 'uploads/user_anonymous/images/1754613209893_Vulkxi.png');

console.log('🧹 Cleaning up orphaned file:', orphanedFile);
console.log('🧹 File exists:', fs.existsSync(orphanedFile));

if (fs.existsSync(orphanedFile)) {
    try {
        fs.unlinkSync(orphanedFile);
        console.log('✅ Orphaned file deleted successfully');
    } catch (error) {
        console.error('❌ Failed to delete orphaned file:', error.message);
    }
} else {
    console.log('ℹ️ No orphaned file to clean up');
}

// List remaining files
console.log('\n📁 Remaining files in uploads directory:');
const uploadsDir = path.join(__dirname, 'uploads/user_anonymous/images');
const files = fs.readdirSync(uploadsDir);
console.log(files);
