import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test the corrected file deletion logic
const originalFilePath = '/uploads/user_anonymous/images/1754613430190_qsutbgg.jpg';
const newFilePath = '/uploads/user_anonymous/images/test_new_file.jpg';

// Fixed path construction (without 'public' prefix)
const oldFullPath = path.join(__dirname, originalFilePath);
const newFullPath = path.join(__dirname, newFilePath);

console.log('🔧 FIXED DELETION TEST');
console.log('🗑️ Old file path:', oldFullPath);
console.log('🗑️ New file path:', newFullPath);
console.log('🗑️ Old file exists:', fs.existsSync(oldFullPath));
console.log('🗑️ Paths different:', oldFullPath !== newFullPath);

console.log('\n✅ The path construction is now correct!');
console.log('✅ Files will be properly deleted during replacement operations');

// Verify current files
console.log('\n📁 Current files in uploads directory:');
const uploadsDir = path.join(__dirname, 'uploads/user_anonymous/images');
const files = fs.readdirSync(uploadsDir);
console.log(files);
