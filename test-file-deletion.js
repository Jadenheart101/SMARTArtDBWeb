import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulate the paths from the replace endpoint
const originalFilePath = '/uploads/user_anonymous/images/1754613209893_Vulkxi.png';
const newFilePath = '/uploads/user_anonymous/images/1754613430190_qsutbgg.jpg';

const oldFullPath = path.join(__dirname, 'public', originalFilePath);
const newFullPath = path.join(__dirname, 'public', newFilePath);

console.log('🗑️ TEST - Old file path:', oldFullPath);
console.log('🗑️ TEST - New file path:', newFullPath);
console.log('🗑️ TEST - Old file exists:', fs.existsSync(oldFullPath));
console.log('🗑️ TEST - New file exists:', fs.existsSync(newFullPath));
console.log('🗑️ TEST - Paths different:', oldFullPath !== newFullPath);

// Check if the file exists in the uploads directory (not public/uploads)
const uploadsOldPath = path.join(__dirname, 'uploads/user_anonymous/images/1754613209893_Vulkxi.png');
const uploadsNewPath = path.join(__dirname, 'uploads/user_anonymous/images/1754613430190_qsutbgg.jpg');

console.log('\n--- Checking uploads directory directly ---');
console.log('🗑️ TEST - Uploads old path:', uploadsOldPath);
console.log('🗑️ TEST - Uploads new path:', uploadsNewPath);
console.log('🗑️ TEST - Uploads old exists:', fs.existsSync(uploadsOldPath));
console.log('🗑️ TEST - Uploads new exists:', fs.existsSync(uploadsNewPath));

console.log('\n--- Directory listing ---');
const uploadsDir = path.join(__dirname, 'uploads/user_anonymous/images');
const files = fs.readdirSync(uploadsDir);
console.log('Files in uploads directory:', files);
