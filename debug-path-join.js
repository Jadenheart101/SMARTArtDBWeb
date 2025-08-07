const path = require('path');
const fs = require('fs');

const __dirname = 'C:\\Users\\Jaden\\OneDrive\\Documents\\GitHub\\SMARTArtDBWeb-1';
const filePath = '/uploads/user_anonymous/images/1754604949919_test-upload.jpg';

console.log('__dirname:', __dirname);
console.log('filePath:', filePath);

const absolutePath = path.join(__dirname, filePath);
console.log('path.join result:', absolutePath);

const fileExists = fs.existsSync(absolutePath);
console.log('File exists:', fileExists);

// Try alternative approaches
const altPath1 = path.join(__dirname, filePath.replace('/', ''));
console.log('Alternative 1 (remove leading /):', altPath1);
console.log('Alternative 1 exists:', fs.existsSync(altPath1));

const altPath2 = path.join(__dirname, '.' + filePath);
console.log('Alternative 2 (add . prefix):', altPath2);
console.log('Alternative 2 exists:', fs.existsSync(altPath2));

const altPath3 = path.join(__dirname, filePath.substring(1));
console.log('Alternative 3 (remove first char):', altPath3);
console.log('Alternative 3 exists:', fs.existsSync(altPath3));

process.exit(0);
