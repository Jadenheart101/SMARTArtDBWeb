const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { testConnection, executeQuery } = require('./database');
require('dotenv').config();

// Helper function to get the lowest available positive integer ID
async function getNextAvailableId(tableName, idColumn) {
  try {
    // Get all existing IDs, ordered
    const existingIds = await executeQuery(
      `SELECT ${idColumn} FROM ${tableName} WHERE ${idColumn} > 0 ORDER BY ${idColumn}`
    );
    
    console.log(`DEBUG: Existing IDs for ${tableName}.${idColumn}:`, existingIds.map(row => row[idColumn]));
    
    // If no records exist, start with 1
    if (existingIds.length === 0) {
      console.log(`DEBUG: No records found, returning 1`);
      return 1;
    }
    
    // Check for gaps in the sequence
    let expectedId = 1;
    for (const row of existingIds) {
      const currentId = row[idColumn];
      if (currentId !== expectedId) {
        // Found a gap, return the missing ID
        console.log(`DEBUG: Found gap at ${expectedId}, current ID is ${currentId}`);
        return expectedId;
      }
      expectedId++;
    }
    
    // No gaps found, return the next sequential number
    console.log(`DEBUG: No gaps found, returning ${expectedId}`);
    return expectedId;
  } catch (error) {
    console.error('Error getting next available ID:', error);
    throw error;
  }
}

// Helper function for automatic storage cleanup
const ENABLE_AUTO_CLEANUP = true; // Enabled for testing editing session protection

// Track active editing sessions to prevent cleanup during editing
const activeEditingSessions = new Map(); // projectId -> { userId, timestamp, lastActivity }

// Helper function to check if any projects are currently being edited
function hasActiveEditingSessions() {
  const now = Date.now();
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes timeout
  
  // Clean up expired sessions
  for (const [projectId, session] of activeEditingSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log('🧹 CLEANUP: Removing expired editing session for project', projectId);
      activeEditingSessions.delete(projectId);
    }
  }
  
  const activeSessions = activeEditingSessions.size;
  if (activeSessions > 0) {
    console.log('🧹 CLEANUP: Found', activeSessions, 'active editing session(s)');
    console.log('🧹 CLEANUP: Active projects:', Array.from(activeEditingSessions.keys()));
  }
  
  return activeSessions > 0;
}

async function performAutomaticStorageCleanup() {
  if (!ENABLE_AUTO_CLEANUP) {
    console.log('🧹 CLEANUP: Auto-cleanup disabled for debugging');
    return { deletedCount: 0, totalOrphaned: 0 };
  }
  
  // Check if any users are currently editing projects
  if (hasActiveEditingSessions()) {
    console.log('🧹 CLEANUP: Skipping auto-cleanup - users are actively editing projects');
    return { deletedCount: 0, totalOrphaned: 0, skipped: true, reason: 'active_editing' };
  }
  
  try {
    console.log('🧹 CLEANUP: Starting automatic storage cleanup...');
    
    // Get all files referenced in the database from multiple sources
    
    // 1. Files in media_files table
    const dbFiles = await executeQuery('SELECT id, file_path, file_name FROM media_files WHERE file_path IS NOT NULL');
    console.log('🧹 CLEANUP: Found', dbFiles.length, 'files in media_files table');
    
    // 2. Files referenced in art table (media_id field with proper foreign key)
    const artFiles = await executeQuery(`
      SELECT mf.id, mf.file_path, mf.file_name, a.ArtId, a.ArtName 
      FROM art a 
      JOIN media_files mf ON a.media_id = mf.id 
      WHERE a.media_id IS NOT NULL
    `);
    console.log('🧹 CLEANUP: Found', artFiles.length, 'files referenced by art info records');
    
    // 3. Files referenced in projects (image_id field)
    const projectFiles = await executeQuery(`
      SELECT mf.id, mf.file_path, mf.file_name, p.ProjectID, p.ProjectName 
      FROM project p 
      JOIN media_files mf ON p.image_id = mf.id 
      WHERE p.image_id IS NOT NULL
    `);
    console.log('🧹 CLEANUP: Found', projectFiles.length, 'files referenced by projects');
    
    // 4. Files referenced in card_media table
    const cardFiles = await executeQuery(`
      SELECT mf.id, mf.file_path, mf.file_name, cm.card_type 
      FROM card_media cm 
      JOIN media_files mf ON cm.media_id = mf.id
    `);
    console.log('🧹 CLEANUP: Found', cardFiles.length, 'files referenced by cards');
    
    // Combine all referenced files
    const allReferencedFiles = [
      ...dbFiles,
      ...artFiles,
      ...projectFiles,
      ...cardFiles
    ];
    
    const dbFilePaths = new Set(allReferencedFiles.map(row => {
      // Normalize path - remove leading slash and convert to forward slashes
      let path = row.file_path;
      if (path.startsWith('/')) path = path.substring(1);
      return path.replace(/\\/g, '/');
    }));
    
    // Also create a set of media file IDs for additional safety
    const referencedMediaIds = new Set([
      ...dbFiles.map(f => f.id.toString()),
      ...artFiles.map(f => f.id.toString()),
      ...projectFiles.map(f => f.id.toString()),
      ...cardFiles.map(f => f.id.toString())
    ]);
    
    console.log('🧹 CLEANUP: Total unique referenced files:', dbFilePaths.size);
    console.log('🧹 CLEANUP: Referenced media IDs:', referencedMediaIds.size);
    console.log('🧹 CLEANUP: Sample referenced paths:', Array.from(dbFilePaths).slice(0, 3), '...');
    
    // Recursively scan uploads directory
    const orphanedFiles = [];
    
    async function scanDirectory(dirPath, relativePath = '') {
      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath, relativeFilePath);
          } else {
            // Check if file is referenced in database
            const uploadRelativePath = relativeFilePath.startsWith('uploads/') 
              ? relativeFilePath 
              : `uploads/${relativeFilePath}`;
              
            // Check multiple ways the file might be referenced
            const isReferencedByPath = dbFilePaths.has(uploadRelativePath) || dbFilePaths.has(relativeFilePath);
            
            // Also check by extracting media ID from filename (for additional safety)
            const fileNameMatch = entry.name.match(/^(\d+)_/);
            const mediaIdFromName = fileNameMatch ? fileNameMatch[1] : null;
            const isReferencedById = mediaIdFromName && referencedMediaIds.has(mediaIdFromName);
            
            if (!isReferencedByPath && !isReferencedById) {
              console.log('🧹 CLEANUP: ❌ Found orphaned file:', {
                fullPath,
                relativeFilePath,
                uploadRelativePath,
                mediaIdFromName,
                checkedPaths: [uploadRelativePath, relativeFilePath],
                isReferencedByPath,
                isReferencedById
              });
              orphanedFiles.push(fullPath);
            } else {
              const referenceType = isReferencedByPath ? 'file path' : 'media ID';
              const referenceDetail = isReferencedByPath ? relativeFilePath : `ID ${mediaIdFromName}`;
              console.log(`🧹 CLEANUP: ✅ File is referenced in database by ${referenceType}: ${referenceDetail}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error.message);
      }
    }
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await scanDirectory(uploadsDir, 'uploads');
    
    console.log('🧹 CLEANUP: Scan complete. Found', orphanedFiles.length, 'orphaned files');
    console.log('🧹 CLEANUP: Reference summary:');
    console.log(`  📁 ${dbFiles.length} files in media_files table`);
    console.log(`  🎨 ${artFiles.length} files linked to art info records`);
    console.log(`  📋 ${projectFiles.length} files linked to projects`);
    console.log(`  🃏 ${cardFiles.length} files linked to cards`);
    console.log(`  🔗 ${allReferencedFiles.length} total file references found`);
    console.log(`  🗂️ ${dbFilePaths.size} unique files protected from deletion`);
    
    // Delete orphaned files
    let deletedCount = 0;
    for (const filePath of orphanedFiles) {
      try {
        console.log('🧹 CLEANUP: 🗑️ Deleting orphaned file:', filePath);
        await fs.promises.unlink(filePath);
        deletedCount++;
        console.log(`🧹 CLEANUP: ✅ Auto-deleted orphaned file: ${filePath}`);
      } catch (error) {
        console.error(`❌ Failed to auto-delete ${filePath}:`, error.message);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Automatic cleanup completed: deleted ${deletedCount} orphaned files`);
    }
    
    return { deletedCount, totalOrphaned: orphanedFiles.length };
  } catch (error) {
    console.error('Automatic storage cleanup error:', error);
    return { deletedCount: 0, totalOrphaned: 0 };
  }
}

// ========== Project Approval Management Helper Function ==========
/**
 * Helper function to reset project approval status when regular users make changes to approved projects
 * Admin users are exempt from this restriction and can modify approved projects without status change
 * @param {number} projectId - The ID of the project being modified
 * @param {number} userId - The ID of the user making the modification
 * @param {string} changeType - Description of what type of change was made (for logging)
 * @returns {Promise<boolean>} - Returns true if project status was reset, false if no change needed
 */
async function resetProjectApprovalIfNeeded(projectId, userId, changeType = 'unknown change') {
  try {
    console.log(`🔄 APPROVAL CHECK: Checking if project ${projectId} needs approval reset for user ${userId} (${changeType})`);
    
    // Check if user is admin
    const userResult = await executeQuery('SELECT isAdmin FROM user WHERE UserID = ?', [userId]);
    if (userResult.length === 0) {
      console.log(`❌ APPROVAL CHECK: User ${userId} not found`);
      return false;
    }
    
    const isAdmin = userResult[0].isAdmin === 1;
    console.log(`👤 APPROVAL CHECK: User ${userId} is${isAdmin ? '' : ' not'} an admin`);
    
    if (isAdmin) {
      console.log(`✅ APPROVAL CHECK: Admin user - no approval reset needed`);
      return false;
    }
    
    // Check if project is currently approved
    const projectResult = await executeQuery('SELECT Approved, NeedsReview, ProjectName FROM project WHERE ProjectID = ?', [projectId]);
    if (projectResult.length === 0) {
      console.log(`❌ APPROVAL CHECK: Project ${projectId} not found`);
      return false;
    }
    
    const project = projectResult[0];
    const isApproved = project.Approved === 1;
    console.log(`📊 APPROVAL CHECK: Project "${project.ProjectName}" is${isApproved ? '' : ' not'} currently approved`);
    
    if (!isApproved) {
      console.log(`ℹ️ APPROVAL CHECK: Project not approved - no reset needed`);
      return false;
    }
    
    // Reset approval status
    const resetResult = await executeQuery(
      'UPDATE project SET Approved = 0, NeedsReview = 1, DateModified = ? WHERE ProjectID = ?',
      [new Date().toISOString().split('T')[0], projectId]
    );
    
    if (resetResult.affectedRows > 0) {
      console.log(`🔄 APPROVAL RESET: Project "${project.ProjectName}" approval status reset due to ${changeType} by regular user ${userId}`);
      return true;
    } else {
      console.log(`❌ APPROVAL RESET: Failed to reset approval status for project ${projectId}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ APPROVAL CHECK ERROR: Failed to check/reset approval for project ${projectId}:`, error);
    return false;
  }
}

const app = express();
const PORT = process.env.PORT || 8080;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically with cache-busting headers
app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, path) => {
        // Disable caching for uploaded files to ensure replacements are shown
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Configure multer for local file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const { userId } = req.body;
        const userDir = path.join(uploadsDir, `user_${userId || 'anonymous'}`);
        
        // Create user directory if it doesn't exist
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        
        // Create file type subdirectories
        let typeDir = userDir;
        if (file.mimetype.startsWith('image/')) {
            typeDir = path.join(userDir, 'images');
        } else if (file.mimetype.startsWith('video/')) {
            typeDir = path.join(userDir, 'videos');
        } else if (file.mimetype.startsWith('audio/')) {
            typeDir = path.join(userDir, 'audio');
        } else {
            typeDir = path.join(userDir, 'files');
        }
        
        if (!fs.existsSync(typeDir)) {
            fs.mkdirSync(typeDir, { recursive: true });
        }
        
        cb(null, typeDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${timestamp}_${name}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images, audio, and video files
        const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|mp3|wav|flac|aac|mp4|avi|mov|wmv|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image, audio, and video files are allowed!'));
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory with cache control for development
app.use(express.static('public', {
    setHeaders: (res, path) => {
        // For development: disable caching of JS/CSS files to ensure updates are loaded
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// CORS middleware (for frontend-backend communication)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// API Routes

// GET /api - API info
app.get('/api', (req, res) => {
  res.json({
    message: 'SMARTArt Database API',
    version: '1.0.0',
    endpoints: {
      'GET /api': 'API information',
      'GET /api/users': 'Get all users',
      'GET /api/users/:id': 'Get user by ID',
      'POST /api/users': 'Create new user',
      'POST /api/login': 'Authenticate user',
      'PUT /api/users/:id': 'Update user',
      'DELETE /api/users/:id': 'Delete user',
      'GET /api/art': 'Get all artworks',
      'GET /api/art/:id': 'Get artwork by ID',
      'GET /api/art/media/:mediaId': 'Get artwork by media file ID',
      'POST /api/art': 'Create new artwork',
      'PUT /api/art/:id': 'Update artwork',
      'DELETE /api/art/:id': 'Delete artwork',
      'GET /api/projects': 'Get all projects (filtered by user access if user_id provided, admins see all if is_admin=true)',
      'GET /api/projects/:id': 'Get project by ID',
      'POST /api/projects': 'Create new project',
      'PUT /api/projects/:id': 'Update project',
      'DELETE /api/projects/:id': 'Delete project',
      'GET /api/projects/:id/topics': 'Get project topics with POIs and cards',
      'POST /api/projects/:id/topics': 'Create project topic',
      'PUT /api/topics/:id': 'Update project topic',
      'DELETE /api/topics/:id': 'Delete project topic (cascades to POIs and cards)',
      'POST /api/topics/:id/pois': 'Create POI for a topic',
      'PUT /api/pois/:id': 'Update POI coordinates',
      'DELETE /api/pois/:id': 'Delete POI (cascades to cards)',
      'POST /api/pois/:id/cards': 'Create card for a POI',
      'PUT /api/cards/:id': 'Update card content',
      'DELETE /api/cards/:id': 'Delete card',
      'GET /api/cards': 'Get all cards',
      'POST /api/cards': 'Create new card',
      'POST /api/cards/:id/media': 'Attach media to card',
      'GET /api/cards/:id/media': 'Get media for card',
      'DELETE /api/cards/:cardId/media/:mediaId': 'Remove media from card',
      'POST /api/media/upload': 'Upload media file',
      'GET /api/media/files': 'List user media files',
      'GET /api/media/file/:fileId': 'Get media file info',
      'PUT /api/media/file/:fileId/display-name': 'Update media file display name',
      'DELETE /api/media/file/:fileId': 'Delete media file',
      'GET /api/users/:userId/media': 'Get user media files',
      'POST /api/media/:mediaId/replace': 'Replace your own media file while preserving references',
      'GET /api/admin/media/all': 'Get all media files for all users (Admin only)',
      'GET /api/admin/media/backup-data': 'Generate backup data with media references (Admin only)',
      'GET /api/admin/media/download-zip': 'Download all media files and backup data as ZIP (Admin only)',
      'GET /api/admin/media/:mediaId': 'Get specific media file info (Admin only)',
      'GET /api/admin/media/:mediaId/usage': 'Get media usage in projects/art/cards (Admin only)',
      'POST /api/admin/media/:mediaId/replace': 'Replace media file while preserving references (Admin only)',
      'DELETE /api/admin/media/:mediaId': 'Delete a media file by ID (Admin only)',
      'GET /api/admin/users': 'Get all users with stats for user management (Admin only)',
      'POST /api/admin/users/:userId/promote': 'Promote user to admin (Admin only)',
      'POST /api/admin/users/:userId/demote': 'Demote admin to regular user (Admin only)',
      'DELETE /api/admin/users/:userId': 'Delete a regular user and their data (Admin only)',
      'PUT /api/admin/projects/:id/approve': 'Approve/unapprove a project (Admin only)'
    }
  });
});

// User API Routes (using your 'user' table)
app.get('/api/users', async (req, res) => {
  try {
    const users = await executeQuery('SELECT UserID, UserName, isAdmin FROM user ORDER BY UserID');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const users = await executeQuery('SELECT UserID, UserName, isAdmin FROM user WHERE UserID = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { UserName, Password, isAdmin } = req.body;
  
  if (!UserName || !Password) {
    return res.status(400).json({ success: false, message: 'UserName and Password are required' });
  }
  
  try {
    // Get next available UserID
    const nextUserId = await getNextAvailableId('user', 'UserID');
    
    const result = await executeQuery(
      'INSERT INTO user (UserID, UserName, Password, isAdmin) VALUES (?, ?, ?, ?)',
      [nextUserId, UserName, Password, isAdmin || 0]
    );
    
    const newUser = await executeQuery('SELECT UserID, UserName, isAdmin FROM user WHERE UserID = ?', [nextUserId]);
    res.status(201).json({ success: true, data: newUser[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }
  
  try {
    const users = await executeQuery(
      'SELECT UserID, UserName, Password, isAdmin FROM user WHERE UserName = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    
    const user = users[0];
    
    // Check password (in a real app, you'd use bcrypt for hashed passwords)
    if (user.Password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    
    // Return user data without password
    res.json({ 
      success: true, 
      data: {
        UserID: user.UserID,
        UserName: user.UserName,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error during login', error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { UserName, Password, isAdmin } = req.body;
  
  try {
    const result = await executeQuery(
      'UPDATE user SET UserName = ?, Password = ?, isAdmin = ? WHERE UserID = ?',
      [UserName, Password, isAdmin, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const updatedUser = await executeQuery('SELECT UserID, UserName, isAdmin FROM user WHERE UserID = ?', [req.params.id]);
    res.json({ success: true, data: updatedUser[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await executeQuery('DELETE FROM user WHERE UserID = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
  }
});

// Art API Routes (using your 'art' table)
app.get('/api/art', async (req, res) => {
  try {
    const artworks = await executeQuery('SELECT * FROM art ORDER BY ArtId');
    res.json({ success: true, data: artworks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching artworks', error: error.message });
  }
});

// Get artwork by media file ID (artcol) - MUST come before /api/art/:id
app.get('/api/art/media/:mediaId', async (req, res) => {
  try {
    const mediaId = req.params.mediaId;
    console.log('🎨 GET /api/art/media/:mediaId called with mediaId:', mediaId);
    
    let mediaFileId;
    
    // Check if mediaId is numeric (direct media file ID) or filename
    console.log('🎨 Debug: mediaId type:', typeof mediaId, 'value:', mediaId);
    console.log('🎨 Debug: regex test result:', /^\d+$/.test(mediaId));
    
    if (/^\d+$/.test(mediaId)) {
      // It's a numeric ID - use it directly
      mediaFileId = parseInt(mediaId);
      console.log('🎨 Using numeric media file ID:', mediaFileId);
      
      // Verify the media file exists
      const mediaFiles = await executeQuery('SELECT id FROM media_files WHERE id = ?', [mediaFileId]);
      if (mediaFiles.length === 0) {
        console.log('🎨 No media file found with ID:', mediaFileId);
        return res.status(404).json({ success: false, message: 'Media file not found' });
      }
    } else {
      // It's a filename - look up the media file ID
      console.log('🎨 Treating as filename, looking up by file_name');
      const mediaFiles = await executeQuery('SELECT id FROM media_files WHERE file_name = ?', [mediaId]);
      
      if (mediaFiles.length === 0) {
        console.log('🎨 No media file found with filename:', mediaId);
        return res.status(404).json({ success: false, message: 'Media file not found' });
      }
      
      mediaFileId = mediaFiles[0].id;
      console.log('🎨 Found media file ID by filename:', mediaFileId);
    }
    
    // Now look for art records linked to this media file ID
    const artwork = await executeQuery('SELECT * FROM art WHERE artcol = ?', [mediaFileId.toString()]);
    console.log('🎨 Database query result:', artwork.length, 'artworks found for media file ID:', mediaFileId);
    
    if (artwork.length === 0) {
      console.log('🎨 No artwork found for media file ID:', mediaFileId);
      return res.status(404).json({ success: false, message: 'No artwork found for this media file' });
    }
    
    console.log('🎨 Found artwork:', artwork[0]);
    res.json({ success: true, data: artwork[0] });
  } catch (error) {
    console.error('❌ Error fetching artwork by media ID:', error);
    res.status(500).json({ success: false, message: 'Error fetching artwork', error: error.message });
  }
});

app.get('/api/art/:id', async (req, res) => {
  try {
    const artwork = await executeQuery('SELECT * FROM art WHERE ArtId = ?', [req.params.id]);
    if (artwork.length === 0) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }
    res.json({ success: true, data: artwork[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching artwork', error: error.message });
  }
});

app.post('/api/art', async (req, res) => {
  const { ArtistName, Submitor, Date: artDate, ArtMedia, ArtName, artcol } = req.body;
  
  console.log('🎨 ART INFO: POST /api/art received:', {
    ArtistName,
    Submitor,
    artDate,
    ArtMedia,
    ArtName,
    artcol,
    bodyKeys: Object.keys(req.body)
  });
  
  if (!ArtistName || !ArtName) {
    console.log('🎨 ART INFO: ❌ Missing required fields');
    return res.status(400).json({ success: false, message: 'ArtistName and ArtName are required' });
  }
  
  try {
    console.log('🎨 ART INFO: Getting next available ArtId');
    
    // Validate that the media file exists if artcol is provided
    if (artcol) {
      const mediaExists = await executeQuery('SELECT id FROM media_files WHERE id = ?', [artcol]);
      if (mediaExists.length === 0) {
        console.log('🎨 ART INFO: ❌ Media file not found for ID:', artcol);
        return res.status(400).json({ 
          success: false, 
          message: `Media file with ID ${artcol} not found. Art info must be linked to an existing media file.` 
        });
      }
      console.log('🎨 ART INFO: ✅ Media file validated for ID:', artcol);
    }
    
    // Get next available ArtId
    const nextArtId = await getNextAvailableId('art', 'ArtId');
    
    console.log('🎨 ART INFO: 📤 Inserting art record with ID:', nextArtId);
    
    const result = await executeQuery(
      'INSERT INTO art (ArtId, ArtistName, Submitor, Date, ArtMedia, ArtName, artcol, media_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nextArtId, ArtistName, Submitor || null, artDate || new Date().toISOString().split('T')[0], ArtMedia || null, ArtName, artcol || null, artcol ? parseInt(artcol) : null]
    );
    
    console.log('🎨 ART INFO: Insert result:', { insertId: result.insertId, affectedRows: result.affectedRows });
    
    const newArtwork = await executeQuery('SELECT * FROM art WHERE ArtId = ?', [nextArtId]);
    console.log('🎨 ART INFO: ✅ Art record created successfully:', newArtwork[0]);
    
    res.status(201).json({ success: true, data: newArtwork[0] });
  } catch (error) {
    console.error('🎨 ART INFO: ❌ Error creating artwork:', error);
    res.status(500).json({ success: false, message: 'Error creating artwork', error: error.message });
  }
});

app.put('/api/art/:id', async (req, res) => {
  const { ArtistName, Submitor, Date: artDate, ArtMedia, ArtName, artcol, user_id } = req.body;
  
  try {
    // Validate that the media file exists if artcol is provided
    if (artcol) {
      const mediaExists = await executeQuery('SELECT id FROM media_files WHERE id = ?', [artcol]);
      if (mediaExists.length === 0) {
        console.log('🎨 ART INFO UPDATE: ❌ Media file not found for ID:', artcol);
        return res.status(400).json({ 
          success: false, 
          message: `Media file with ID ${artcol} not found. Art info must be linked to an existing media file.` 
        });
      }
      console.log('🎨 ART INFO UPDATE: ✅ Media file validated for ID:', artcol);
    }
    
    const result = await executeQuery(
      'UPDATE art SET ArtistName = ?, Submitor = ?, Date = ?, ArtMedia = ?, ArtName = ?, artcol = ?, media_id = ? WHERE ArtId = ?',
      [ArtistName, Submitor, artDate, ArtMedia, ArtName, artcol, artcol ? parseInt(artcol) : null, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }
    
    // Check if project approval status needs to be reset
    if (user_id && artcol) {
      try {
        // Find projects that use the media file associated with this art
        const projectsResult = await executeQuery(`
          SELECT p.ProjectID 
          FROM project p 
          JOIN media_files m ON p.image_id = m.id 
          WHERE m.id = ?
        `, [artcol]);
        
        // Reset approval for all projects using this media
        for (const project of projectsResult) {
          await resetProjectApprovalIfNeeded(project.ProjectID, user_id, 'art info update');
        }
      } catch (approvalError) {
        console.error('Error checking approval reset for art update:', approvalError);
        // Don't fail the update if approval reset fails
      }
    }
    
    const updatedArtwork = await executeQuery('SELECT * FROM art WHERE ArtId = ?', [req.params.id]);
    res.json({ success: true, data: updatedArtwork[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating artwork', error: error.message });
  }
});

app.delete('/api/art/:id', async (req, res) => {
  try {
    const result = await executeQuery('DELETE FROM art WHERE ArtId = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }
    
    res.json({ success: true, message: 'Artwork deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting artwork', error: error.message });
  }
});

// Project API Routes
app.get('/api/projects', async (req, res) => {
  try {
    // Support filtering by user_id via query param
    const userId = req.query.user_id;
    const isAdmin = req.query.is_admin === 'true' || req.query.is_admin === '1';
    let query, params;
    
    // Join with media_files table to get image information and user table for creator info
    if (userId && !isAdmin) {
      // Regular user - only show their projects
      query = `
        SELECT 
          p.*,
          m.file_name,
          m.file_path,
          m.displayName as media_display_name,
          u.UserName as creator_name
        FROM project p
        LEFT JOIN media_files m ON p.image_id = m.id
        LEFT JOIN user u ON p.user_id = u.UserID
        WHERE p.user_id = ?
        ORDER BY p.ProjectID
      `;
      params = [userId];
    } else if (isAdmin) {
      // Admin user - show all projects with creator information
      query = `
        SELECT 
          p.*,
          m.file_name,
          m.file_path,
          m.displayName as media_display_name,
          u.UserName as creator_name,
          u.UserID as creator_id
        FROM project p
        LEFT JOIN media_files m ON p.image_id = m.id
        LEFT JOIN user u ON p.user_id = u.UserID
        ORDER BY p.ProjectID
      `;
      params = [];
    } else {
      // No user specified - show all projects (for backwards compatibility)
      query = `
        SELECT 
          p.*,
          m.file_name,
          m.file_path,
          m.displayName as media_display_name,
          u.UserName as creator_name
        FROM project p
        LEFT JOIN media_files m ON p.image_id = m.id
        LEFT JOIN user u ON p.user_id = u.UserID
        ORDER BY p.ProjectID
      `;
      params = [];
    }
    
    const projects = await executeQuery(query, params);

    // Map the results to include proper field names
    const mappedProjects = projects.map(project => ({
      ProjectID: project.ProjectID,
      ProjectName: project.ProjectName,
      Description: project.description !== undefined ? project.description : project.Description, // Handle both lowercase and uppercase
      user_id: project.user_id,
      creator_name: project.creator_name, // Include creator name for admin view
      creator_id: project.creator_id, // Include creator ID for admin view
      Approved: project.Approved,
      NeedsReview: project.NeedsReview,
      DateCreated: project.DateCreated,
      DateModified: project.DateModified,
      DateApproved: project.DateApproved,
      ImageID: project.image_id,
      ImageURL: project.file_url || (project.file_path ? `/uploads/${path.relative(uploadsDir, project.file_path).replace(/\\/g, '/')}` : null),
      ImageName: project.media_display_name || project.file_name,
      admin_notes: project.admin_notes // Include admin notes for status determination
    }));

    res.json({ success: true, data: mappedProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching projects', error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  const { ProjectName, Description, Approved, NeedsReview, user_id } = req.body;
  if (!ProjectName || !user_id) {
    return res.status(400).json({ success: false, message: 'ProjectName and user_id are required' });
  }
  
  console.log('📝 POST /api/projects received:', {
    ProjectName,
    Description,
    user_id,
    Approved,
    NeedsReview
  });
  
  try {
    // Get next available ProjectID
    const nextProjectId = await getNextAvailableId('project', 'ProjectID');
    
    const today = new Date().toISOString().split('T')[0];
    const result = await executeQuery(
      'INSERT INTO project (ProjectID, ProjectName, Description, user_id, Approved, NeedsReview, DateCreated, DateModified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nextProjectId, ProjectName, Description || '', user_id, Approved || 0, NeedsReview || 1, today, today]
    );
    const newProject = await executeQuery('SELECT * FROM project WHERE ProjectID = ?', [nextProjectId]);
    
    console.log('📝 Created project with data:', newProject[0]);
    res.status(201).json({ success: true, data: newProject[0] });
  } catch (error) {
    console.error('❌ Error creating project:', error);
    res.status(500).json({ success: false, message: 'Error creating project', error: error.message });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { ProjectName, Description, ImageID, user_id } = req.body;
    
    console.log('📝 PUT /api/projects/:id received:', {
      projectId,
      ProjectName,
      Description,
      ImageID,
      user_id,
      bodyKeys: Object.keys(req.body)
    });
    
    if (!ProjectName) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    const updateFields = ['ProjectName = ?'];
    const updateValues = [ProjectName];
    
    if (Description !== undefined) {
      updateFields.push('Description = ?');
      updateValues.push(Description);
    }
    
    if (ImageID !== undefined) {
      let actualImageId = ImageID;
      
      // If ImageID is a string (filename), look up the actual media_files.id
      if (typeof ImageID === 'string' && isNaN(parseInt(ImageID))) {
        console.log('Converting filename to media ID:', ImageID);
        const mediaResult = await executeQuery(
          'SELECT id FROM media_files WHERE file_name = ?',
          [ImageID]
        );
        
        if (mediaResult.length > 0) {
          actualImageId = mediaResult[0].id;
          console.log('Found media ID:', actualImageId);
        } else {
          console.log('No media file found for filename:', ImageID);
          return res.status(400).json({ 
            success: false, 
            message: `Image file '${ImageID}' not found in media database` 
          });
        }
      }
      
      updateFields.push('image_id = ?');
      updateValues.push(actualImageId);
    }
    
    updateFields.push('DateModified = ?');
    updateValues.push(new Date().toISOString().split('T')[0]);
    
    updateValues.push(projectId);
    
    const result = await executeQuery(
      `UPDATE project SET ${updateFields.join(', ')} WHERE ProjectID = ?`,
      updateValues
    );
    
    console.log('📝 Database update result:', {
      affectedRows: result.affectedRows,
      updateFields: updateFields,
      updateValues: updateValues,
      projectId
    });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check if project approval status needs to be reset
    const approvalReset = await resetProjectApprovalIfNeeded(projectId, user_id, 'project update');
    
    let message = 'Project updated successfully';
    if (approvalReset) {
      message += '. Project approval has been reset and is now pending review.';
    }
    
    res.json({ success: true, message, approvalReset });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Error updating project', error: error.message });
  }
});

// Get single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    console.log('🔍 GET /api/projects/:id called for project:', projectId);
    
    // Join with media_files table to get image information if linked
    const query = `
      SELECT 
        p.*,
        m.file_name,
        m.file_path,
        m.file_url,
        m.displayName as media_display_name
      FROM project p
      LEFT JOIN media_files m ON p.image_id = m.id
      WHERE p.ProjectID = ?
    `;
    
    console.log('🔍 Executing query:', query, 'with params:', [projectId]);
    
    const projects = await executeQuery(query, [projectId]);
    console.log('🔍 Raw database result:', projects);
    
    if (projects.length === 0) {
      console.log('❌ No project found with ID:', projectId);
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const project = projects[0];
    console.log('🔍 Raw project data from DB:', project);
    
    // Map database fields to frontend expectations
    const responseData = {
      ProjectID: project.ProjectID,
      ProjectName: project.ProjectName,
      Description: project.description !== undefined ? project.description : project.Description, // Handle both lowercase and uppercase
      user_id: project.user_id,
      Approved: project.Approved,
      NeedsReview: project.NeedsReview,
      DateCreated: project.DateCreated,
      DateModified: project.DateModified,
      DateApproved: project.DateApproved,
      ImageID: project.image_id, // Map image_id to ImageID
      ImageURL: project.file_url || (project.file_path ? `/uploads/${path.relative(uploadsDir, project.file_path).replace(/\\/g, '/')}` : null), // Use file_url or construct from file_path
      ImageName: project.media_display_name || project.file_name,
      admin_notes: project.admin_notes // Include admin notes
    };
    
    console.log('🔍 Response data being sent:', responseData);
    
    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('❌ Error fetching project:', error);
    res.status(500).json({ success: false, message: 'Error fetching project', error: error.message });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Check if user is admin
    const user = await executeQuery('SELECT isAdmin FROM user WHERE UserID = ?', [user_id]);
    
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isAdmin = user[0].isAdmin;

    // If user is admin, allow deletion of any project
    // If user is not admin, only allow deletion of their own projects
    let projectQuery, projectParams;
    
    if (isAdmin) {
      // Admin can delete any project
      projectQuery = 'SELECT * FROM project WHERE ProjectID = ?';
      projectParams = [projectId];
    } else {
      // Regular user can only delete their own projects
      projectQuery = 'SELECT * FROM project WHERE ProjectID = ? AND user_id = ?';
      projectParams = [projectId, user_id];
    }
    
    // First check if the project exists (and belongs to user if not admin)
    const projects = await executeQuery(projectQuery, projectParams);
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found or access denied' });
    }

    // Delete the project (admin can delete any project, user only their own)
    let deleteQuery, deleteParams;
    
    if (isAdmin) {
      deleteQuery = 'DELETE FROM project WHERE ProjectID = ?';
      deleteParams = [projectId];
    } else {
      deleteQuery = 'DELETE FROM project WHERE ProjectID = ? AND user_id = ?';
      deleteParams = [projectId, user_id];
    }
    
    const result = await executeQuery(deleteQuery, deleteParams);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found or could not be deleted' });
    }
    
    // Perform automatic storage cleanup after project deletion
    const cleanupResult = await performAutomaticStorageCleanup();
    let cleanupMessage = '';
    if (cleanupResult.skipped && cleanupResult.reason === 'active_editing') {
      cleanupMessage = ' (cleanup skipped - users are editing)';
    } else if (cleanupResult.deletedCount > 0) {
      cleanupMessage = ` and cleaned up ${cleanupResult.deletedCount} orphaned file(s)`;
    }
    
    res.json({ success: true, message: `Project deleted successfully${cleanupMessage}` });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Error deleting project', error: error.message });
  }
});

// Admin Project Approval Endpoint
app.put('/api/admin/projects/:id/approve', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id } = req.body;
    
    console.log('🔐 Admin approval request:', { projectId, user_id });
    
    // Check if user is admin
    const adminCheck = await executeQuery('SELECT isAdmin FROM user WHERE UserID = ?', [user_id]);
    if (!adminCheck || adminCheck.length === 0 || !adminCheck[0].isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    // Get current project status
    const project = await executeQuery('SELECT * FROM project WHERE ProjectID = ?', [projectId]);
    if (project.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const currentStatus = project[0];
    let updateResult;
    
    if (currentStatus.Approved === 1) {
      // Project is already approved, unapprove it
      updateResult = await executeQuery(
        'UPDATE project SET Approved = 0, NeedsReview = 1, DateModified = ? WHERE ProjectID = ?',
        [new Date().toISOString().split('T')[0], projectId]
      );
      
      if (updateResult.affectedRows > 0) {
        res.json({ 
          success: true, 
          message: 'Project unapproved successfully',
          newStatus: { approved: false, needsReview: true }
        });
      } else {
        res.status(500).json({ success: false, message: 'Failed to unapprove project' });
      }
    } else {
      // Project is not approved, approve it
      updateResult = await executeQuery(
        'UPDATE project SET Approved = 1, NeedsReview = 0, DateModified = ? WHERE ProjectID = ?',
        [new Date().toISOString().split('T')[0], projectId]
      );
      
      if (updateResult.affectedRows > 0) {
        res.json({ 
          success: true, 
          message: 'Project approved successfully',
          newStatus: { approved: true, needsReview: false }
        });
      } else {
        res.status(500).json({ success: false, message: 'Failed to approve project' });
      }
    }
    
  } catch (error) {
    console.error('Error updating project approval:', error);
    res.status(500).json({ success: false, message: 'Error updating project approval', error: error.message });
  }
});

// Admin Notes Management API Routes
app.put('/api/admin/projects/:id/notes', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { admin_notes, user_id } = req.body;
    
    console.log('📝 ADMIN NOTES: PUT /api/admin/projects/:id/notes received:', {
      projectId,
      admin_notes: admin_notes ? admin_notes.substring(0, 100) + '...' : admin_notes,
      user_id
    });
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    // Check if user is admin
    const userResult = await executeQuery('SELECT isAdmin FROM user WHERE UserID = ?', [user_id]);
    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!userResult[0].isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    // Check if project exists
    const projectResult = await executeQuery('SELECT ProjectID FROM project WHERE ProjectID = ?', [projectId]);
    if (projectResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Update admin notes
    const result = await executeQuery(
      'UPDATE project SET admin_notes = ? WHERE ProjectID = ?',
      [admin_notes || null, projectId]
    );
    
    if (result.affectedRows > 0) {
      // If admin added notes but didn't approve, update status to show "Reviewed, Pending Revisions"
      if (admin_notes && admin_notes.trim()) {
        await executeQuery(
          'UPDATE project SET Approved = 0, NeedsReview = 1 WHERE ProjectID = ?',
          [projectId]
        );
        console.log('📝 ADMIN NOTES: Project status updated to "Reviewed, Pending Revisions"');
      }
      
      console.log('📝 ADMIN NOTES: Notes updated successfully for project', projectId);
      res.json({ 
        success: true, 
        message: 'Admin notes updated successfully',
        hasNotes: !!(admin_notes && admin_notes.trim())
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update admin notes' });
    }
    
  } catch (error) {
    console.error('Error updating admin notes:', error);
    res.status(500).json({ success: false, message: 'Error updating admin notes', error: error.message });
  }
});

// Get admin notes for a project
app.get('/api/admin/projects/:id/notes', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    // Check if user is admin
    const userResult = await executeQuery('SELECT isAdmin FROM user WHERE UserID = ?', [user_id]);
    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!userResult[0].isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    // Get project with admin notes
    const projectResult = await executeQuery(
      'SELECT ProjectID, ProjectName, admin_notes FROM project WHERE ProjectID = ?', 
      [projectId]
    );
    
    if (projectResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const project = projectResult[0];
    res.json({ 
      success: true, 
      data: {
        projectId: project.ProjectID,
        projectName: project.ProjectName,
        admin_notes: project.admin_notes
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin notes:', error);
    res.status(500).json({ success: false, message: 'Error fetching admin notes', error: error.message });
  }
});

// Editing Session Management API Routes
app.post('/api/projects/:id/editing/start', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    // Check if project exists
    const projectResult = await executeQuery('SELECT ProjectID FROM project WHERE ProjectID = ?', [projectId]);
    if (projectResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Start editing session
    activeEditingSessions.set(projectId, {
      userId: user_id,
      timestamp: Date.now(),
      lastActivity: Date.now()
    });
    
    console.log(`📝 EDITING: User ${user_id} started editing project ${projectId}`);
    res.json({ success: true, message: 'Editing session started' });
  } catch (error) {
    console.error('Error starting editing session:', error);
    res.status(500).json({ success: false, message: 'Error starting editing session', error: error.message });
  }
});

app.post('/api/projects/:id/editing/heartbeat', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    const session = activeEditingSessions.get(projectId);
    if (session && session.userId === user_id) {
      session.lastActivity = Date.now();
      console.log(`💓 EDITING: Heartbeat for user ${user_id} editing project ${projectId}`);
    }
    
    res.json({ success: true, message: 'Heartbeat received' });
  } catch (error) {
    console.error('Error updating editing heartbeat:', error);
    res.status(500).json({ success: false, message: 'Error updating editing heartbeat', error: error.message });
  }
});

app.post('/api/projects/:id/editing/end', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id } = req.body || {};
    
    console.log('📝 EDITING: Ending session for project:', projectId, 'user_id:', user_id);
    
    if (!user_id) {
      console.log('📝 EDITING: No user_id provided, removing session anyway');
      // Remove the session even if no user_id provided (for cleanup)
      activeEditingSessions.delete(projectId);
      return res.json({ success: true, message: 'Session ended (no user validation)' });
    }
    
    const session = activeEditingSessions.get(projectId);
    if (session && session.userId === user_id) {
      activeEditingSessions.delete(projectId);
      console.log(`✅ EDITING: User ${user_id} finished editing project ${projectId}`);
    }
    
    res.json({ success: true, message: 'Editing session ended' });
  } catch (error) {
    console.error('Error ending editing session:', error);
    res.status(500).json({ success: false, message: 'Error ending editing session', error: error.message });
  }
});

app.get('/api/editing/status', async (req, res) => {
  try {
    // Clean up expired sessions first
    hasActiveEditingSessions();
    
    const sessions = Array.from(activeEditingSessions.entries()).map(([projectId, session]) => ({
      projectId,
      userId: session.userId,
      timestamp: session.timestamp,
      lastActivity: session.lastActivity
    }));
    
    res.json({ 
      success: true, 
      activeSessions: sessions.length,
      sessions: sessions 
    });
  } catch (error) {
    console.error('Error getting editing status:', error);
    res.status(500).json({ success: false, message: 'Error getting editing status', error: error.message });
  }
});

// Card API Routes
app.get('/api/cards', async (req, res) => {
  try {
    const cards = await executeQuery('SELECT *, id as CardID, poi_id as POIID_FK, card_title as Title, card_content as Body FROM card ORDER BY card_order, id');
    res.json({ success: true, data: cards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cards', error: error.message });
  }
});

app.post('/api/cards', async (req, res) => {
  const { Title, Body, Type, POIID_FK, Notes, References, card_title, card_content, poi_id } = req.body;
  
  const title = card_title || Title || 'New Card';
  const content = card_content || Body || '';
  const poiId = poi_id || POIID_FK;
  
  if (!title) {
    return res.status(400).json({ success: false, message: 'Card title is required' });
  }
  
  try {
    // Get next available Card ID
    const nextCardId = await getNextAvailableId('card', 'id');
    
    const result = await executeQuery(
      'INSERT INTO card (id, poi_id, card_title, card_content, card_order) VALUES (?, ?, ?, ?, ?)',
      [nextCardId, poiId || null, title, content, 0]
    );
    
    const newCard = await executeQuery('SELECT *, id as CardID, poi_id as POIID_FK, card_title as Title, card_content as Body FROM card WHERE id = ?', [nextCardId]);
    res.status(201).json({ success: true, data: newCard[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating card', error: error.message });
  }
});

// ========== Local Media Storage Endpoints ==========

// Upload file locally
app.post('/api/media/upload', upload.single('file'), async (req, res) => {
  console.log('=== UPLOAD ENDPOINT CALLED ===');
  try {
    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    const { userId, customName } = req.body;
    
    console.log('Upload request received:', {
      userId,
      userIdType: typeof userId,
      customName,
      filename,
      mimetype,
      size
    });
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    // Ensure userId is a valid integer
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      console.log('Invalid userId:', userId, 'parsed as:', parsedUserId);
      return res.status(400).json({ success: false, message: 'Invalid User ID' });
    }
    
    // Generate file URL (relative path for web access)
    const relativePath = path.relative(uploadsDir, filePath);
    const fileUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    try {
      // Get next available media file ID
      const nextMediaId = await getNextAvailableId('media_files', 'id');
      
      // Generate a unique file_id for this upload
      const uniqueFileId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Inserting media record:', {
        id: nextMediaId,
        user_id: parsedUserId,
        file_name: filename,
        original_name: originalname,
        file_path: fileUrl, // Store relative path instead of absolute path
        file_url: fileUrl,
        mime_type: mimetype,
        file_size: size
      });
      
      console.log('About to insert into database:', {
        nextMediaId, parsedUserId, filename, originalname, fileUrl, mimetype, size
      });
      
      // Store file info in database (use relative path for file_path)
      const result = await executeQuery(
        'INSERT INTO media_files (id, user_id, file_name, original_name, file_path, file_url, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nextMediaId, parsedUserId, filename, originalname, fileUrl, fileUrl, mimetype, size]
      );
      
      console.log('Database insert successful, result:', result);
      
      res.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          id: nextMediaId,
          name: filename,
          originalName: originalname,
          url: fileUrl,
          size: size,
          mimeType: mimetype,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (dbError) {
      console.error('=== DATABASE ERROR DURING UPLOAD ===');
      console.error('Error storing file info in database:', dbError);
      console.error('Stack trace:', dbError.stack);
      // Delete the uploaded file if database insert fails
      try {
        fs.unlinkSync(filePath);
        console.log('Deleted uploaded file due to database error');
      } catch (deleteError) {
        console.error('Failed to delete uploaded file:', deleteError);
      }
      res.status(500).json({ success: false, message: 'Failed to save file information' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading file', error: error.message });
  }
});

// List user's media files
app.get('/api/media/files', async (req, res) => {
  try {
    const { userId } = req.query;
    
    console.log('=== MEDIA FILES ENDPOINT CALLED ===');
    console.log('userId:', userId);
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    const files = await executeQuery(
      'SELECT * FROM media_files WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    console.log('Query returned', files.length, 'files for user', userId);
    
    // Check if files still exist on disk and clean up database if not
    const validFiles = [];
    for (const file of files) {
      console.log('Processing file:', file.id, 'user_id:', file.user_id, 'file_path:', file.file_path);
      // Only check file existence if file_path is provided (for local files)
      // Convert relative path to absolute path for file existence check
      const absolutePath = file.file_path ? path.join(__dirname, file.file_path) : null;
      const fileExists = !file.file_path || fs.existsSync(absolutePath);
      
      console.log('File exists:', fileExists, 'at path:', absolutePath);
      
      if (fileExists) {
        console.log('Adding file to validFiles');
        validFiles.push({
          id: file.id,
          name: file.file_name,
          originalName: file.original_name,
          displayName: file.displayName,
          url: file.file_url || file.download_url, // fallback to download_url if file_url is null
          size: file.file_size,
          mimeType: file.mime_type,
          fileType: file.mime_type ? file.mime_type.split('/')[0] : 'unknown', // Extract main type (image, video, audio, etc.)
          createdAt: file.created_at,
          updatedAt: file.updated_at
        });
      } else {
        // Remove from database if file doesn't exist
        await executeQuery('DELETE FROM media_files WHERE id = ?', [file.id]);
      }
    }
    
    res.json({ success: true, files: validFiles });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ success: false, message: 'Error listing files', error: error.message });
  }
});

// Get specific media file info
app.get('/api/media/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('🗂️ GET /api/media/file/:fileId called with fileId:', fileId);
    
    const files = await executeQuery('SELECT * FROM media_files WHERE id = ?', [fileId]);
    
    if (files.length === 0) {
      console.log('🗂️ No file found in database with ID:', fileId);
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const file = files[0];
    console.log('🗂️ Found file in database:', { id: file.id, file_name: file.file_name, file_path: file.file_path });
    
    // Check if file exists on disk (only check if file_path is provided)
    if (file.file_path) {
      // Convert relative path to absolute path for file existence check
      const absolutePath = path.join(__dirname, file.file_path);
      console.log('🗂️ Checking file existence at:', absolutePath);
      
      if (!fs.existsSync(absolutePath)) {
        console.log('🗂️ ❌ File not found on disk, removing from database');
        // Remove from database if file doesn't exist
        await executeQuery('DELETE FROM media_files WHERE id = ?', [fileId]);
        return res.status(404).json({ success: false, message: 'File not found on disk' });
      }
      console.log('🗂️ ✅ File exists on disk');
    }
    
    const responseData = {
      success: true,
      file: {
        id: file.id,
        name: file.file_name,
        originalName: file.original_name,
        url: file.file_url,
        size: file.file_size,
        mimeType: file.mime_type,
        createdAt: file.created_at
      }
    };
    
    console.log('🗂️ Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ success: false, message: 'Error getting file info', error: error.message });
  }
});

// Rename media file
app.put('/api/media/file/:fileId/rename', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, newFileName, newOriginalName } = req.body;
    
    if (!userId || !newFileName) {
      return res.status(400).json({ success: false, message: 'User ID and new filename are required' });
    }
    
    // Get file info
    const files = await executeQuery('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [fileId, userId]);
    
    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found or access denied' });
    }
    
    const file = files[0];
    const oldPath = file.file_path;
    
    if (!oldPath) {
      return res.status(400).json({ success: false, message: 'Cannot rename files without local storage' });
    }
    
    try {
      // Generate new file path
      const dir = path.dirname(oldPath);
      const timestamp = Date.now();
      const ext = path.extname(newFileName);
      const name = path.basename(newFileName, ext);
      const newPath = path.join(dir, `${timestamp}_${name}${ext}`);
      
      // Rename file on disk
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
      
      // Generate new URL
      const relativePath = path.relative(uploadsDir, newPath);
      const newFileUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
      const newDbFileName = `${timestamp}_${name}${ext}`;
      
      // Update database
      await executeQuery(
        'UPDATE media_files SET file_name = ?, original_name = ?, file_path = ?, file_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newDbFileName, newOriginalName || newFileName, newPath, newFileUrl, fileId]
      );
      
      res.json({
        success: true,
        message: 'File renamed successfully',
        file: {
          id: fileId,
          name: newDbFileName,
          originalName: newOriginalName || newFileName,
          url: newFileUrl
        }
      });
    } catch (fsError) {
      console.error('Error renaming file:', fsError);
      res.status(500).json({ success: false, message: 'Failed to rename file on disk' });
    }
  } catch (error) {
    console.error('Rename error:', error);
    res.status(500).json({ success: false, message: 'Error renaming file', error: error.message });
  }
});

// Update media file display name
app.put('/api/media/file/:fileId/display-name', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, displayName } = req.body;
    
    if (!userId || !displayName) {
      return res.status(400).json({ success: false, message: 'User ID and display name are required' });
    }
    
    // Get file info to verify ownership
    const files = await executeQuery('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [fileId, userId]);
    
    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found or access denied' });
    }
    
    // Update display name in database
    await executeQuery(
      'UPDATE media_files SET displayName = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [displayName, fileId]
    );
    
    res.json({
      success: true,
      message: 'Display name updated successfully',
      file: {
        id: fileId,
        displayName: displayName
      }
    });
  } catch (error) {
    console.error('Display name update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update display name', error: error.message });
  }
});

// Delete media file
app.delete('/api/media/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.body;
    
    console.log('Delete request received:', { fileId, userId, body: req.body });
    
    if (!userId) {
      console.log('No userId provided');
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    // Get file info
    console.log('Querying for file:', { fileId, userId });
    const files = await executeQuery('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [fileId, userId]);
    console.log('Query result:', files);
    
    if (files.length === 0) {
      console.log('File not found or access denied');
      return res.status(404).json({ success: false, message: 'File not found or access denied' });
    }
    
    const file = files[0];
    console.log('File to delete:', file);
    
    try {
      // Delete file from disk
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
        console.log('File deleted from disk:', file.file_path);
      } else {
        console.log('File not found on disk:', file.file_path);
      }
      
      // Remove from database
      await executeQuery('DELETE FROM media_files WHERE id = ?', [fileId]);
      console.log('File deleted from database');
      
      // Perform automatic storage cleanup after file deletion
      const cleanupResult = await performAutomaticStorageCleanup();
      let cleanupMessage = '';
      if (cleanupResult.skipped && cleanupResult.reason === 'active_editing') {
        cleanupMessage = ' (cleanup skipped - users are editing)';
      } else if (cleanupResult.deletedCount > 0) {
        cleanupMessage = ` and cleaned up ${cleanupResult.deletedCount} orphaned file(s)`;
      }
      
      res.json({ success: true, message: `File deleted successfully${cleanupMessage}` });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ success: false, message: 'Error deleting file' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Error deleting file', error: error.message });
  }
});

// Get user's media files (alternative endpoint)
app.get('/api/users/:userId/media', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const files = await executeQuery(
      'SELECT * FROM media_files WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error getting user media:', error);
    res.status(500).json({ success: false, message: 'Error getting user media', error: error.message });
  }
});

// ========== Project Topics API Routes (using existing tables) ==========

// Get project topics with POIs and cards
app.get('/api/projects/:id/topics', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    console.log('📋 GET /api/projects/:id/topics called for project:', projectId);
    
    // Get topics for the project using project_topics table
    const topics = await executeQuery(
      'SELECT *, id as TopicID, project_id as ProjectID_FK, topic_title as Label FROM project_topics WHERE project_id = ? ORDER BY topic_order, id',
      [projectId]
    );
    
    console.log('📋 Found', topics.length, 'topics for project:', projectId);
    
    // For each topic, get its POIs and cards
    const topicsWithContent = await Promise.all(topics.map(async (topic) => {
      console.log('📋 Processing topic:', topic.TopicID, topic.Label);
      
      // Get POIs for this topic (using actual column names)
      const pois = await executeQuery(
        'SELECT *, id as POIID, topic_id as TopicID_FK, x_coordinate as XCoord, y_coordinate as YCoord FROM poi WHERE topic_id = ? ORDER BY id',
        [topic.TopicID]
      );
      
      console.log('📍 Found', pois.length, 'POIs for topic:', topic.TopicID);
      
      // For each POI, get its cards (using actual column names)
      const poisWithCards = await Promise.all(pois.map(async (poi) => {
        console.log('📍 Processing POI:', poi.POIID);
        
        const cards = await executeQuery(
          'SELECT *, id as CardID, poi_id as POIID_FK, card_title as Title, card_content as Body, user_notes as Notes, refs as `References` FROM card WHERE poi_id = ? ORDER BY card_order, id',
          [poi.POIID]
        );
        
        console.log('📄 Found', cards.length, 'cards for POI:', poi.POIID);
        
        // For each card, get its media
        const cardsWithMedia = await Promise.all(cards.map(async (card) => {
          const media = await executeQuery(`
            SELECT mf.*, cm.Card_Media_ID 
            FROM card_media cm
            JOIN media_files mf ON cm.Media_ID_FK = mf.id
            WHERE cm.Card_ID_FK = ?
          `, [card.CardID]);
          
          console.log('🖼️ Found', media.length, 'media files for card:', card.CardID);
          
          return { ...card, media };
        }));
        
        return { ...poi, cards: cardsWithMedia };
      }));
      
      return { 
        ...topic, 
        pois: poisWithCards,
        is_expanded: topic.is_expanded || false
      };
    }));
    
    console.log('📋 Sending topics response with', topicsWithContent.length, 'topics');
    
    res.json({ success: true, data: topicsWithContent });
  } catch (error) {
    console.error('❌ Error fetching project topics:', error);
    res.status(500).json({ success: false, message: 'Error fetching project topics', error: error.message });
  }
});

// Create project topic
app.post('/api/projects/:id/topics', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { Label, topic_title, topic_content } = req.body;
    
    console.log('📋 TOPIC: POST /api/projects/:id/topics received:', {
      projectId,
      Label,
      topic_title,
      topic_content,
      bodyKeys: Object.keys(req.body)
    });
    
    const title = topic_title || Label || 'New Topic';
    const content = topic_content || '';
    
    console.log('📋 TOPIC: Processed values:', { title, content });
    
    if (!title) {
      console.log('📋 TOPIC: ❌ Missing topic title');
      return res.status(400).json({ success: false, message: 'Topic title is required' });
    }
    
    console.log('📋 TOPIC: Getting next available topic ID');
    // Get next available topic ID
    const nextTopicId = await getNextAvailableId('project_topics', 'id');
    
    console.log('📋 TOPIC: 📤 Inserting topic with ID:', nextTopicId);
    
    const result = await executeQuery(
      'INSERT INTO project_topics (id, project_id, topic_title, topic_content, topic_order) VALUES (?, ?, ?, ?, ?)',
      [nextTopicId, projectId, title, content, 0]
    );
    
    console.log('📋 TOPIC: Insert result:', { insertId: result.insertId, affectedRows: result.affectedRows });
    
    const newTopic = await executeQuery(
      'SELECT *, id as TopicID, project_id as ProjectID_FK, topic_title as Label FROM project_topics WHERE id = ?',
      [nextTopicId]
    );
    
    res.status(201).json({ 
      success: true, 
      data: { 
        ...newTopic[0], 
        pois: [],
        is_expanded: false 
      } 
    });
  } catch (error) {
    console.error('Error creating project topic:', error);
    res.status(500).json({ success: false, message: 'Error creating project topic', error: error.message });
  }
});

// Update project topic
app.put('/api/topics/:id', async (req, res) => {
  try {
    const topicId = req.params.id;
    const { Label, topic_title, topic_content, is_expanded, user_id } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    
    if (topic_title || Label) {
      updateFields.push('topic_title = ?');
      updateValues.push(topic_title || Label);
    }
    
    if (topic_content !== undefined) {
      updateFields.push('topic_content = ?');
      updateValues.push(topic_content);
    }
    
    if (is_expanded !== undefined) {
      updateFields.push('is_expanded = ?');
      updateValues.push(is_expanded);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateValues.push(topicId);
    
    const result = await executeQuery(
      `UPDATE project_topics SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    // Check if project approval status needs to be reset
    if (user_id) {
      try {
        // Get the project ID for this topic
        const topicResult = await executeQuery('SELECT project_id FROM project_topics WHERE id = ?', [topicId]);
        if (topicResult.length > 0) {
          await resetProjectApprovalIfNeeded(topicResult[0].project_id, user_id, 'topic update');
        }
      } catch (approvalError) {
        console.error('Error checking approval reset for topic update:', approvalError);
        // Don't fail the update if approval reset fails
      }
    }
    
    const updatedTopic = await executeQuery('SELECT *, id as TopicID, project_id as ProjectID_FK, topic_title as Label FROM project_topics WHERE id = ?', [topicId]);
    res.json({ success: true, data: updatedTopic[0] });
  } catch (error) {
    console.error('Error updating project topic:', error);
    res.status(500).json({ success: false, message: 'Error updating project topic', error: error.message });
  }
});

// Delete project topic (and cascade to POIs and cards)
app.delete('/api/topics/:id', async (req, res) => {
  try {
    const topicId = req.params.id;
    
    // First delete all cards for POIs in this topic
    await executeQuery(
      'DELETE c FROM card c INNER JOIN poi p ON c.poi_id = p.id WHERE p.topic_id = ?',
      [topicId]
    );
    
    // Then delete all POIs for this topic
    await executeQuery('DELETE FROM poi WHERE topic_id = ?', [topicId]);
    
    // Finally delete the topic
    const result = await executeQuery('DELETE FROM project_topics WHERE id = ?', [topicId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }
    
    res.json({ success: true, message: 'Topic and all related content deleted successfully' });
  } catch (error) {
    console.error('Error deleting project topic:', error);
    res.status(500).json({ success: false, message: 'Error deleting project topic', error: error.message });
  }
});

// Create POI for a topic
app.post('/api/topics/:id/pois', async (req, res) => {
  try {
    const topicId = req.params.id;
    const { XCoord, YCoord, poi_title, poi_content } = req.body;
    
    // Get next available POI ID
    const nextPOIId = await getNextAvailableId('poi', 'id');
    
    const result = await executeQuery(
      'INSERT INTO poi (id, topic_id, poi_title, poi_content, x_coordinate, y_coordinate) VALUES (?, ?, ?, ?, ?, ?)',
      [nextPOIId, topicId, poi_title || 'New POI', poi_content || '', XCoord || 0, YCoord || 0]
    );
    
    const newPOI = await executeQuery(
      'SELECT * FROM poi WHERE id = ?',
      [nextPOIId]
    );
    
    res.status(201).json({ 
      success: true, 
      data: { 
        ...newPOI[0], 
        POIID: newPOI[0].id, // Add compatibility field
        cards: [] 
      } 
    });
  } catch (error) {
    console.error('Error creating POI:', error);
    res.status(500).json({ success: false, message: 'Error creating POI', error: error.message });
  }
});

// Update POI coordinates
app.put('/api/pois/:id', async (req, res) => {
  try {
    const poiId = req.params.id;
    const { XCoord, YCoord, pImage, pLocation, poi_title, poi_content, user_id } = req.body;
    
    console.log('📍 PUT /api/pois/:id received:', {
      poiId,
      XCoord,
      YCoord,
      pImage,
      pLocation,
      poi_title,
      poi_content,
      user_id,
      bodyKeys: Object.keys(req.body)
    });
    
    const updateFields = [];
    const updateValues = [];
    
    if (XCoord !== undefined) {
      updateFields.push('x_coordinate = ?');
      updateValues.push(XCoord);
    }
    
    if (YCoord !== undefined) {
      updateFields.push('y_coordinate = ?');
      updateValues.push(YCoord);
    }
    
    if (pImage !== undefined) {
      updateFields.push('pImage = ?');
      updateValues.push(pImage);
    }
    
    if (pLocation !== undefined) {
      updateFields.push('pLocation = ?');
      updateValues.push(pLocation);
    }
    
    if (poi_title !== undefined) {
      updateFields.push('poi_title = ?');
      updateValues.push(poi_title);
    }
    
    if (poi_content !== undefined) {
      updateFields.push('poi_content = ?');
      updateValues.push(poi_content);
    }
    
    if (updateFields.length === 0) {
      console.log('📍 No fields to update for POI:', poiId);
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateValues.push(poiId);
    
    console.log('📍 Updating POI with fields:', updateFields);
    console.log('📍 Update values:', updateValues);
    
    const result = await executeQuery(
      `UPDATE poi SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'POI not found' });
    }
    
    // Get project ID for approval reset check
    if (user_id) {
      try {
        const projectResult = await executeQuery(`
          SELECT pt.project_id 
          FROM poi p 
          JOIN project_topics pt ON p.topic_id = pt.id 
          WHERE p.id = ?
        `, [poiId]);
        
        if (projectResult.length > 0) {
          const projectId = projectResult[0].project_id;
          await resetProjectApprovalIfNeeded(projectId, user_id, 'POI update');
        }
      } catch (approvalError) {
        console.error('Error checking approval reset for POI update:', approvalError);
        // Don't fail the update if approval reset fails
      }
    }
    
    const updatedPOI = await executeQuery('SELECT *, id as POIID, topic_id as TopicID_FK, x_coordinate as XCoord, y_coordinate as YCoord FROM poi WHERE id = ?', [poiId]);
    res.json({ success: true, data: updatedPOI[0] });
  } catch (error) {
    console.error('Error updating POI:', error);
    res.status(500).json({ success: false, message: 'Error updating POI', error: error.message });
  }
});

// Delete POI (and cascade to cards)
app.delete('/api/pois/:id', async (req, res) => {
  try {
    const poiId = req.params.id;
    
    // First delete all cards for this POI
    await executeQuery('DELETE FROM card WHERE poi_id = ?', [poiId]);
    
    // Then delete the POI
    const result = await executeQuery('DELETE FROM poi WHERE id = ?', [poiId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'POI not found' });
    }
    
    res.json({ success: true, message: 'POI and all related cards deleted successfully' });
  } catch (error) {
    console.error('Error deleting POI:', error);
    res.status(500).json({ success: false, message: 'Error deleting POI', error: error.message });
  }
});

// Create card for a POI
app.post('/api/pois/:id/cards', async (req, res) => {
  try {
    const poiId = req.params.id;
    const { Title, Body, Type, Notes, References, card_title, card_content, card_order } = req.body;
    
    const title = card_title || Title || 'New Card';
    const content = card_content || Body || '';
    const order = card_order || 0;
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Card title is required' });
    }
    
    // Get next available Card ID
    const nextCardId = await getNextAvailableId('card', 'id');
    
    const result = await executeQuery(
      'INSERT INTO card (id, poi_id, card_title, card_content, card_order) VALUES (?, ?, ?, ?, ?)',
      [nextCardId, poiId, title, content, order]
    );
    
    const newCard = await executeQuery(
      'SELECT *, id as CardID, poi_id as POIID_FK, card_title as Title, card_content as Body FROM card WHERE id = ?',
      [nextCardId]
    );
    
    res.status(201).json({ success: true, data: newCard[0] });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ success: false, message: 'Error creating card', error: error.message });
  }
});

// Update card
app.put('/api/cards/:id', async (req, res) => {
  try {
    const cardId = req.params.id;
    const { Title, Body, Type, Notes, References, card_title, card_content, card_order, user_id } = req.body;
    
    console.log('📄 PUT /api/cards/:id received:', {
      cardId,
      Title,
      Body,
      Type,
      Notes,
      References,
      card_title,
      card_content,
      card_order,
      user_id,
      bodyKeys: Object.keys(req.body)
    });
    
    const updateFields = [];
    const updateValues = [];
    
    if (card_title || Title) {
      updateFields.push('card_title = ?');
      updateValues.push(card_title || Title);
    }
    
    if (card_content !== undefined || Body !== undefined) {
      updateFields.push('card_content = ?');
      updateValues.push(card_content !== undefined ? card_content : Body);
    }
    
    if (card_order !== undefined) {
      updateFields.push('card_order = ?');
      updateValues.push(card_order);
    }
    
    if (Type !== undefined) {
      updateFields.push('card_type = ?');
      updateValues.push(Type);
    }
    
    if (Notes !== undefined) {
      updateFields.push('user_notes = ?');
      updateValues.push(Notes);
    }
    
    if (References !== undefined) {
      updateFields.push('refs = ?');
      updateValues.push(References);
    }
    
    if (updateFields.length === 0) {
      console.log('📄 No fields to update for card:', cardId);
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateValues.push(cardId);
    
    console.log('📄 Updating card with fields:', updateFields);
    console.log('📄 Update values:', updateValues);
    
    const result = await executeQuery(
      `UPDATE card SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    console.log('📄 Card update result:', result);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }
    
    // Get project ID for approval reset check
    if (user_id) {
      try {
        const projectResult = await executeQuery(`
          SELECT pt.project_id 
          FROM card c 
          JOIN poi p ON c.poi_id = p.id 
          JOIN project_topics pt ON p.topic_id = pt.id 
          WHERE c.id = ?
        `, [cardId]);
        
        if (projectResult.length > 0) {
          const projectId = projectResult[0].project_id;
          await resetProjectApprovalIfNeeded(projectId, user_id, 'card update');
        }
      } catch (approvalError) {
        console.error('Error checking approval reset for card update:', approvalError);
        // Don't fail the update if approval reset fails
      }
    }
    
    const updatedCard = await executeQuery('SELECT *, id as CardID, poi_id as POIID_FK, card_title as Title, card_content as Body FROM card WHERE id = ?', [cardId]);
    console.log('📄 Updated card data:', updatedCard[0]);
    res.json({ success: true, data: updatedCard[0] });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ success: false, message: 'Error updating card', error: error.message });
  }
});

// Delete card
app.delete('/api/cards/:id', async (req, res) => {
  try {
    const cardId = req.params.id;
    
    const result = await executeQuery('DELETE FROM card WHERE id = ?', [cardId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }
    
    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ success: false, message: 'Error deleting card', error: error.message });
  }
});

// Attach media to card
app.post('/api/cards/:id/media', async (req, res) => {
  try {
    const cardId = req.params.id;
    const { mediaId } = req.body;

    if (!mediaId) {
      return res.status(400).json({ success: false, message: 'Media ID is required' });
    }

    // Get next available Card_Media_ID
    const maxCardMedia = await executeQuery('SELECT MAX(Card_Media_ID) as maxId FROM card_media');
    const nextCardMediaId = (maxCardMedia[0]?.maxId || 0) + 1;

    const result = await executeQuery(
      'INSERT INTO card_media (Card_Media_ID, Card_ID_FK, Media_ID_FK) VALUES (?, ?, ?)',
      [nextCardMediaId, cardId, mediaId]
    );

    res.status(201).json({ success: true, message: 'Media attached to card successfully' });
  } catch (error) {
    console.error('Error attaching media to card:', error);
    res.status(500).json({ success: false, message: 'Error attaching media', error: error.message });
  }
});

// Get media for card
app.get('/api/cards/:id/media', async (req, res) => {
  try {
    const cardId = req.params.id;
    
    const media = await executeQuery(`
      SELECT mf.*, cm.Card_Media_ID 
      FROM card_media cm
      JOIN media_files mf ON cm.Media_ID_FK = mf.id
      WHERE cm.Card_ID_FK = ?
    `, [cardId]);
    
    res.json({ success: true, data: media });
  } catch (error) {
    console.error('Error fetching card media:', error);
    res.status(500).json({ success: false, message: 'Error fetching card media', error: error.message });
  }
});

// Remove media from card
app.delete('/api/cards/:cardId/media/:mediaId', async (req, res) => {
  try {
    const { cardId, mediaId } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM card_media WHERE Card_ID_FK = ? AND Media_ID_FK = ?',
      [cardId, mediaId]
    );
    
    res.json({ success: true, message: 'Media removed from card successfully' });
  } catch (error) {
    console.error('Error removing media from card:', error);
    res.status(500).json({ success: false, message: 'Error removing media', error: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SMARTArt Database API',
    api_docs: '/api',
    status: 'running'
  });
});

// ========== ADMIN DATABASE MANAGEMENT ENDPOINTS ==========

// Get database table data (Admin only)
app.get('/api/admin/database/tables/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { page = 1, limit = 50 } = req.query;
        
        // Validate table name to prevent SQL injection
        const allowedTables = ['project', 'media_files', 'card', 'poi', 'user', 'art', 'project_topics'];
        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid table name'
            });
        }
        
        const offset = (page - 1) * limit;
        
        // Get total count
        const countResult = await executeQuery(`SELECT COUNT(*) as total FROM ${tableName}`);
        const total = countResult[0].total;
        
        // Get table data with pagination
        let query = `SELECT * FROM ${tableName}`;
        let queryWithJoins = query;
        
        // Add JOINs for better data display
        if (tableName === 'project') {
            queryWithJoins = `
                SELECT 
                    p.*,
                    u.UserName as creator_name,
                    m.file_name as image_filename,
                    m.displayName as image_display_name
                FROM project p
                LEFT JOIN user u ON p.user_id = u.UserID
                LEFT JOIN media_files m ON p.image_id = m.id
            `;
        } else if (tableName === 'media_files') {
            queryWithJoins = `
                SELECT 
                    mf.*,
                    u.UserName as owner_name
                FROM media_files mf
                LEFT JOIN user u ON mf.user_id = u.UserID
            `;
        } else if (tableName === 'card') {
            queryWithJoins = `
                SELECT 
                    c.*,
                    p.poi_title,
                    pt.topic_title,
                    pr.ProjectName
                FROM card c
                LEFT JOIN poi p ON c.poi_id = p.id
                LEFT JOIN project_topics pt ON p.topic_id = pt.id
                LEFT JOIN project pr ON pt.project_id = pr.ProjectID
            `;
        } else if (tableName === 'poi') {
            queryWithJoins = `
                SELECT 
                    poi.*,
                    pt.topic_title,
                    pr.ProjectName
                FROM poi
                LEFT JOIN project_topics pt ON poi.topic_id = pt.id
                LEFT JOIN project pr ON pt.project_id = pr.ProjectID
            `;
        } else if (tableName === 'project_topics') {
            queryWithJoins = `
                SELECT 
                    pt.*,
                    pr.ProjectName,
                    u.UserName as project_creator
                FROM project_topics pt
                LEFT JOIN project pr ON pt.project_id = pr.ProjectID
                LEFT JOIN user u ON pr.user_id = u.UserID
            `;
        }
        
        queryWithJoins += ` ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`;
        
        const data = await executeQuery(queryWithJoins);
        
        // Get table schema information
        const schemaResult = await executeQuery(`DESCRIBE ${tableName}`);
        const schema = schemaResult.map(col => ({
            field: col.Field,
            type: col.Type,
            null: col.Null,
            key: col.Key,
            default: col.Default,
            extra: col.Extra
        }));
        
        res.json({
            success: true,
            data: {
                tableName,
                schema,
                rows: data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Database table fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch table data',
            details: error.message
        });
    }
});

// Get database table statistics (Admin only)
app.get('/api/admin/database/stats', async (req, res) => {
    try {
        const stats = {};
        const tables = ['project', 'media_files', 'card', 'poi', 'user', 'art', 'project_topics'];
        
        for (const table of tables) {
            const result = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
            stats[table] = result[0].count;
        }
        
        // Get additional statistics
        const userStats = await executeQuery(`
            SELECT 
                COUNT(*) as total_users,
                SUM(isAdmin) as admin_users,
                COUNT(*) - SUM(isAdmin) as regular_users
            FROM user
        `);
        
        const mediaStats = await executeQuery(`
            SELECT 
                COUNT(*) as total_files,
                SUM(file_size) as total_size,
                COUNT(DISTINCT user_id) as users_with_media
            FROM media_files
        `);
        
        const projectStats = await executeQuery(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(Approved) as approved_projects,
                SUM(NeedsReview) as projects_needing_review,
                COUNT(DISTINCT user_id) as unique_creators
            FROM project
        `);
        
        res.json({
            success: true,
            data: {
                tableCounts: stats,
                userStats: userStats[0],
                mediaStats: mediaStats[0],
                projectStats: projectStats[0]
            }
        });
        
    } catch (error) {
        console.error('Database stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch database statistics',
            details: error.message
        });
    }
});

// Scan for orphaned records in a specific table (Admin only)
app.get('/api/admin/database/orphaned/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const allowedTables = ['project', 'media_files', 'card', 'poi', 'art', 'project_topics'];
        
        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid table name or table cleanup not allowed'
            });
        }

        let orphanedRecords = [];
        
        switch (tableName) {
            case 'project':
                // Projects with invalid user_id or image_id
                orphanedRecords = await executeQuery(`
                    SELECT p.*, 'Invalid user_id' as reason
                    FROM project p 
                    LEFT JOIN user u ON p.user_id = u.UserID 
                    WHERE u.UserID IS NULL
                    UNION ALL
                    SELECT p.*, 'Invalid image_id' as reason
                    FROM project p 
                    LEFT JOIN media_files m ON p.image_id = m.id 
                    WHERE p.image_id IS NOT NULL AND m.id IS NULL
                `);
                break;
                
            case 'media_files':
                // Media files with invalid user_id
                orphanedRecords = await executeQuery(`
                    SELECT m.*, 'Invalid user_id' as reason
                    FROM media_files m 
                    LEFT JOIN user u ON m.user_id = u.UserID 
                    WHERE u.UserID IS NULL
                `);
                break;
                
            case 'card':
                // Cards with invalid poi_id
                orphanedRecords = await executeQuery(`
                    SELECT c.*, 'Invalid poi_id' as reason
                    FROM card c 
                    LEFT JOIN poi p ON c.poi_id = p.id 
                    WHERE p.id IS NULL
                `);
                break;
                
            case 'poi':
                // POIs with invalid topic_id
                orphanedRecords = await executeQuery(`
                    SELECT p.*, 'Invalid topic_id' as reason
                    FROM poi p 
                    LEFT JOIN project_topics pt ON p.topic_id = pt.id 
                    WHERE pt.id IS NULL
                `);
                break;
                
            case 'art':
                // Art records with invalid media_id or project_id references
                orphanedRecords = await executeQuery(`
                    SELECT a.*, 'Invalid media_id reference' as reason
                    FROM art a 
                    LEFT JOIN media_files m ON a.media_id = m.id 
                    WHERE a.media_id IS NOT NULL AND m.id IS NULL
                    UNION ALL
                    SELECT a.*, 'Invalid project_id reference' as reason
                    FROM art a 
                    LEFT JOIN project p ON a.project_id = p.ProjectID 
                    WHERE a.project_id IS NOT NULL AND p.ProjectID IS NULL
                `);
                break;
                
            case 'project_topics':
                // Project topics with invalid project_id
                orphanedRecords = await executeQuery(`
                    SELECT pt.*, 'Invalid project_id' as reason
                    FROM project_topics pt 
                    LEFT JOIN project p ON pt.project_id = p.ProjectID 
                    WHERE p.ProjectID IS NULL
                `);
                break;
        }

        res.json({
            success: true,
            data: {
                tableName,
                orphanedCount: orphanedRecords.length,
                orphanedRecords: orphanedRecords.slice(0, 100) // Limit to first 100 for display
            }
        });
        
    } catch (error) {
        console.error('Orphaned records scan error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to scan for orphaned records',
            details: error.message
        });
    }
});

// Clean up orphaned records in a specific table (Admin only)
app.delete('/api/admin/database/orphaned/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const allowedTables = ['project', 'media_files', 'card', 'poi', 'art', 'project_topics'];
        
        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid table name or table cleanup not allowed'
            });
        }

        let deletedCount = 0;
        
        switch (tableName) {
            case 'project':
                // Delete projects with invalid user_id
                const invalidUserProjects = await executeQuery(`
                    DELETE p FROM project p 
                    LEFT JOIN user u ON p.user_id = u.UserID 
                    WHERE u.UserID IS NULL
                `);
                
                // Delete projects with invalid image_id
                const invalidImageProjects = await executeQuery(`
                    DELETE p FROM project p 
                    LEFT JOIN media_files m ON p.image_id = m.id 
                    WHERE p.image_id IS NOT NULL AND m.id IS NULL
                `);
                
                deletedCount = invalidUserProjects.affectedRows + invalidImageProjects.affectedRows;
                break;
                
            case 'media_files':
                // Delete media files with invalid user_id
                const result = await executeQuery(`
                    DELETE m FROM media_files m 
                    LEFT JOIN user u ON m.user_id = u.UserID 
                    WHERE u.UserID IS NULL
                `);
                deletedCount = result.affectedRows;
                break;
                
            case 'card':
                // Delete cards with invalid poi_id
                const cardResult = await executeQuery(`
                    DELETE c FROM card c 
                    LEFT JOIN poi p ON c.poi_id = p.id 
                    WHERE p.id IS NULL
                `);
                deletedCount = cardResult.affectedRows;
                break;
                
            case 'poi':
                // Delete POIs with invalid topic_id
                const poiResult = await executeQuery(`
                    DELETE p FROM poi p 
                    LEFT JOIN project_topics pt ON p.topic_id = pt.id 
                    WHERE pt.id IS NULL
                `);
                deletedCount = poiResult.affectedRows;
                break;
                
            case 'art':
                // Delete art records with invalid media_id or project_id references
                const artResult = await executeQuery(`
                    DELETE a FROM art a 
                    LEFT JOIN media_files m ON a.media_id = m.id 
                    WHERE a.media_id IS NOT NULL AND m.id IS NULL
                `);
                const artResult2 = await executeQuery(`
                    DELETE a FROM art a 
                    LEFT JOIN project p ON a.project_id = p.ProjectID 
                    WHERE a.project_id IS NOT NULL AND p.ProjectID IS NULL
                `);
                deletedCount = artResult.affectedRows + artResult2.affectedRows;
                break;
                
            case 'project_topics':
                // Delete project topics with invalid project_id
                const topicsResult = await executeQuery(`
                    DELETE pt FROM project_topics pt 
                    LEFT JOIN project p ON pt.project_id = p.ProjectID 
                    WHERE p.ProjectID IS NULL
                `);
                deletedCount = topicsResult.affectedRows;
                break;
        }

        res.json({
            success: true,
            data: {
                tableName,
                deletedCount,
                message: `Cleaned up ${deletedCount} orphaned records from ${tableName} table`
            }
        });
        
    } catch (error) {
        console.error('Orphaned records cleanup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clean up orphaned records',
            details: error.message
        });
    }
});

// ========== ADMIN MEDIA ENDPOINTS ==========

// Get all media files for all users (Admin only)
app.get('/api/admin/media/all', async (req, res) => {
  try {
    const files = await executeQuery(`
      SELECT 
        mf.*,
        u.UserName as owner_name
      FROM media_files mf
      LEFT JOIN user u ON mf.user_id = u.UserID
      ORDER BY mf.created_at DESC
    `);
    
    // Process files to include user information and file existence check
    const processedFiles = [];
    for (const file of files) {
      // Check if file still exists on disk (convert relative path to absolute path)
      const absolutePath = file.file_path ? path.join(__dirname, file.file_path) : null;
      const fileExists = !file.file_path || fs.existsSync(absolutePath);
      
      if (fileExists) {
        processedFiles.push({
          id: file.id,
          file_name: file.file_name,
          original_name: file.original_name,
          display_name: file.displayName,
          file_path: file.file_url,
          file_size: file.file_size,
          mime_type: file.mime_type,
          upload_date: file.created_at,
          user_id: file.user_id,
          username: file.owner_name || 'Unknown User',
          filePath: file.file_path
        });
      }
    }
    
    // Calculate statistics
    const stats = {
      totalMedia: processedFiles.length,
      totalUsers: [...new Set(processedFiles.map(f => f.user_id))].length,
      totalSize: processedFiles.reduce((sum, file) => sum + (file.file_size || 0), 0),
      fileTypes: {
        images: processedFiles.filter(f => f.mime_type && f.mime_type.startsWith('image/')).length,
        videos: processedFiles.filter(f => f.mime_type && f.mime_type.startsWith('video/')).length,
        audio: processedFiles.filter(f => f.mime_type && f.mime_type.startsWith('audio/')).length,
        other: processedFiles.filter(f => !f.mime_type || (!f.mime_type.startsWith('image/') && !f.mime_type.startsWith('video/') && !f.mime_type.startsWith('audio/'))).length
      }
    };
    
    res.json({ 
      success: true, 
      data: {
        media: processedFiles,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error getting all media files:', error);
    res.status(500).json({ success: false, message: 'Error getting all media files', error: error.message });
  }
});

// Generate backup data for all media files (Admin only)
app.get('/api/admin/media/backup-data', async (req, res) => {
  try {
    const files = await executeQuery(`
      SELECT 
        mf.*,
        u.UserName as owner_name,
        p.ProjectID as linked_project_id,
        p.ProjectName as linked_project_name
      FROM media_files mf
      LEFT JOIN user u ON mf.user_id = u.UserID
      LEFT JOIN project p ON p.image_id = mf.id
      ORDER BY mf.created_at DESC
    `);
    
    // Also get art info linked to media files
    const artInfo = await executeQuery(`
      SELECT 
        a.*,
        mf.file_name,
        mf.original_name,
        u.UserName as owner_name
      FROM art a
      LEFT JOIN media_files mf ON a.artcol = mf.file_name
      LEFT JOIN user u ON mf.user_id = u.UserID
      WHERE mf.file_name IS NOT NULL
    `);
    
    const backupData = {
      generatedAt: new Date().toISOString(),
      version: "1.0",
      description: "SMARTArt Database Media Backup Reference File",
      mediaFiles: files.map(file => ({
        id: file.id,
        fileName: file.file_name,
        originalName: file.original_name,
        displayName: file.displayName,
        filePath: file.file_path,
        fileUrl: file.file_url,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        userId: file.user_id,
        ownerName: file.owner_name,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        linkedProjects: file.linked_project_id ? [{
          projectId: file.linked_project_id,
          projectName: file.linked_project_name
        }] : []
      })),
      artInformation: artInfo.map(art => ({
        artId: art.ArtId,
        artistName: art.ArtistName,
        artName: art.ArtName,
        artMedia: art.ArtMedia,
        submitor: art.Submitor,
        date: art.Date,
        linkedMediaFile: art.artcol,
        mediaOwner: art.owner_name,
        createdAt: art.created_at,
        updatedAt: art.updated_at
      })),
      restoreInstructions: {
        mediaFiles: "Upload files to their original paths or update file_path/file_url in database",
        projects: "Update project.ImageURL to point to restored media files",
        artInfo: "Ensure art.artcol matches the restored media file names"
      }
    };
    
    res.json({ 
      success: true, 
      data: backupData
    });
  } catch (error) {
    console.error('Error generating backup data:', error);
    res.status(500).json({ success: false, message: 'Error generating backup data', error: error.message });
  }
});

// Download all media files as ZIP (Admin only)
app.get('/api/admin/media/download-zip', async (req, res) => {
  try {
    // Get all media files
    const files = await executeQuery(`
      SELECT 
        mf.*,
        u.UserName as owner_name,
        p.ProjectID as linked_project_id,
        p.ProjectName as linked_project_name
      FROM media_files mf
      LEFT JOIN user u ON mf.user_id = u.UserID
      LEFT JOIN project p ON p.image_id = mf.id
      ORDER BY mf.created_at DESC
    `);
    
    // Get art info linked to media files
    const artInfo = await executeQuery(`
      SELECT 
        a.*,
        mf.file_name,
        mf.original_name,
        u.UserName as owner_name
      FROM art a
      LEFT JOIN media_files mf ON a.artcol = mf.file_name
      LEFT JOIN user u ON mf.user_id = u.UserID
      WHERE mf.file_name IS NOT NULL
    `);
    
    // Create backup JSON
    const backupData = {
      generatedAt: new Date().toISOString(),
      version: "1.0",
      description: "SMARTArt Database Media Backup Reference File",
      mediaFiles: files.map(file => ({
        id: file.id,
        fileName: file.file_name,
        originalName: file.original_name,
        displayName: file.displayName,
        filePath: file.file_path,
        fileUrl: file.file_url,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        userId: file.user_id,
        ownerName: file.owner_name,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        linkedProjects: file.linked_project_id ? [{
          projectId: file.linked_project_id,
          projectName: file.linked_project_name
        }] : []
      })),
      artInformation: artInfo.map(art => ({
        artId: art.ArtId,
        artistName: art.ArtistName,
        artName: art.ArtName,
        artMedia: art.ArtMedia,
        submitor: art.Submitor,
        date: art.Date,
        linkedMediaFile: art.artcol,
        mediaOwner: art.owner_name,
        createdAt: art.created_at,
        updatedAt: art.updated_at
      })),
      restoreInstructions: {
        mediaFiles: "Upload files to their original paths or update file_path/file_url in database",
        projects: "Update project.ImageURL to point to restored media files",
        artInfo: "Ensure art.artcol matches the restored media file names"
      }
    };
    
    // Set response headers for ZIP download
    const zipFilename = `media-backup-${new Date().toISOString().split('T')[0]}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Best compression
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error creating ZIP file' });
      }
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Add backup JSON to archive
    archive.append(JSON.stringify(backupData, null, 2), { name: 'backup-data.json' });
    
    // Add each media file to the archive
    for (const file of files) {
      try {
        const absolutePath = path.join(__dirname, file.file_path);
        if (fs.existsSync(absolutePath)) {
          archive.file(absolutePath, { name: `media/${file.file_name}` });
        } else {
          console.warn(`File not found: ${absolutePath}`);
          // Add a note about missing file
          archive.append(`File not found: ${file.file_name}`, { name: `missing-files/${file.file_name}.txt` });
        }
      } catch (fileError) {
        console.error(`Error adding file ${file.file_name} to archive:`, fileError);
        archive.append(`Error reading file: ${fileError.message}`, { name: `error-files/${file.file_name}.txt` });
      }
    }
    
    // Finalize the archive
    archive.finalize();
    
  } catch (error) {
    console.error('Error creating media ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error creating media ZIP file', error: error.message });
    }
  }
});

// Admin: Delete media file
app.delete('/api/admin/media/:mediaId', async (req, res) => {
    const mediaId = req.params.mediaId;

    if (!mediaId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Media ID is required' 
        });
    }

    try {
        // First, get the media file path for deletion
        const results = await executeQuery('SELECT file_path FROM media_files WHERE id = ?', [mediaId]);

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Media file not found' 
            });
        }

        const filePath = results[0].file_path;

        // Delete from database
        await executeQuery('DELETE FROM media_files WHERE id = ?', [mediaId]);

        // Try to delete the actual file
        const fs = require('fs');
        try {
            const fullPath = path.join(__dirname, 'public', filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (fileErr) {
            console.warn('Could not delete file:', fileErr.message);
            // Continue anyway - database record is already deleted
        }

        // Perform automatic storage cleanup after media deletion
        const cleanupResult = await performAutomaticStorageCleanup();
        let cleanupMessage = '';
        if (cleanupResult.skipped && cleanupResult.reason === 'active_editing') {
            cleanupMessage = ' (cleanup skipped - users are editing)';
        } else if (cleanupResult.deletedCount > 0) {
            cleanupMessage = ` and cleaned up ${cleanupResult.deletedCount} orphaned file(s)`;
        }

        res.json({ 
            success: true, 
            message: `Media file deleted successfully${cleanupMessage}` 
        });
        
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Database error occurred' 
        });
    }
});

// Admin: Get media usage information  
app.get('/api/admin/media/:mediaId/usage', async (req, res) => {
    const mediaId = req.params.mediaId;

    if (!mediaId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Media ID is required' 
        });
    }

    try {
        // Get media file info first
        const mediaResults = await executeQuery('SELECT file_name, file_path FROM media_files WHERE id = ?', [mediaId]);

        if (mediaResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Media file not found' 
            });
        }

        const mediaFile = mediaResults[0];
        const fileName = mediaFile.file_name;
        
        // Check usage in different tables (using correct table names and relationships)
        const mediaFileName = mediaFile.file_name;
        
        const [projectResults, artResults] = await Promise.all([
            executeQuery('SELECT COUNT(*) as count FROM project WHERE image_id = ?', [mediaId]),
            executeQuery('SELECT COUNT(*) as count FROM art WHERE artcol = ?', [mediaFileName])
        ]);

        const projects = projectResults[0].count;
        const artworks = artResults[0].count;

        res.json({ 
            success: true, 
            data: {
                projects: projects,
                artworks: artworks,
                cards: 0, // Cards table doesn't exist yet
                totalUsages: projects + artworks
            }
        });
        
    } catch (error) {
        console.error('Error checking media usage:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error checking media usage' 
        });
    }
});

// Admin: Get all users for user management
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await executeQuery(`
            SELECT 
                UserID, 
                UserName, 
                isAdmin,
                (SELECT COUNT(*) FROM project WHERE user_id = UserID) as projectCount,
                (SELECT COUNT(*) FROM media_files WHERE user_id = UserID) as mediaCount
            FROM user 
            ORDER BY isAdmin DESC, UserID ASC
        `);
        
        res.json({ 
            success: true, 
            data: users.map(user => ({
                id: user.UserID,
                username: user.UserName,
                isAdmin: !!user.isAdmin,
                createdAt: null, // Created date not available in current schema
                projectCount: user.projectCount || 0,
                mediaCount: user.mediaCount || 0
            }))
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error fetching users' 
        });
    }
});

// Admin: Promote user to admin
app.post('/api/admin/users/:userId/promote', async (req, res) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            error: 'User ID is required' 
        });
    }
    
    try {
        // Check if user exists
        const userExists = await executeQuery('SELECT UserID, UserName, isAdmin FROM user WHERE UserID = ?', [userId]);
        
        if (userExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        const user = userExists[0];
        
        if (user.isAdmin) {
            return res.status(400).json({ 
                success: false, 
                error: 'User is already an admin' 
            });
        }
        
        // Promote user to admin
        await executeQuery('UPDATE user SET isAdmin = 1 WHERE UserID = ?', [userId]);
        
        console.log(`👑 Admin promotion: User "${user.UserName}" (ID: ${userId}) promoted to admin`);
        
        res.json({ 
            success: true, 
            message: `User "${user.UserName}" has been promoted to admin`,
            data: {
                id: user.UserID,
                username: user.UserName,
                isAdmin: true
            }
        });
        
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error promoting user to admin' 
        });
    }
});

// Admin: Demote admin to regular user  
app.post('/api/admin/users/:userId/demote', async (req, res) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            error: 'User ID is required' 
        });
    }
    
    try {
        // Check if user exists
        const userExists = await executeQuery('SELECT UserID, UserName, isAdmin FROM user WHERE UserID = ?', [userId]);
        
        if (userExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        const user = userExists[0];
        
        if (!user.isAdmin) {
            return res.status(400).json({ 
                success: false, 
                error: 'User is not an admin' 
            });
        }
        
        // Check if this is the last admin
        const adminCount = await executeQuery('SELECT COUNT(*) as count FROM user WHERE isAdmin = 1');
        if (adminCount[0].count <= 1) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot demote the last admin user' 
            });
        }
        
        // Demote admin to regular user
        await executeQuery('UPDATE user SET isAdmin = 0 WHERE UserID = ?', [userId]);
        
        console.log(`👤 Admin demotion: User "${user.UserName}" (ID: ${userId}) demoted to regular user`);
        
        res.json({ 
            success: true, 
            message: `User "${user.UserName}" has been demoted to regular user`,
            data: {
                id: user.UserID,
                username: user.UserName,
                isAdmin: false
            }
        });
        
    } catch (error) {
        console.error('Error demoting user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error demoting user' 
        });
    }
});

// Admin: Delete user (with safety checks)
app.delete('/api/admin/users/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            error: 'User ID is required' 
        });
    }
    
    try {
        // Check if user exists
        const userExists = await executeQuery('SELECT UserID, UserName, isAdmin FROM user WHERE UserID = ?', [userId]);
        
        if (userExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        const user = userExists[0];
        
        // Prevent deleting admin users through this endpoint
        if (user.isAdmin) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete admin users. Please demote to regular user first.' 
            });
        }
        
        // Delete user's projects first
        const projectCount = await executeQuery('SELECT COUNT(*) as count FROM project WHERE user_id = ?', [userId]);
        if (projectCount[0].count > 0) {
            await executeQuery('DELETE FROM project WHERE user_id = ?', [userId]);
            console.log(`🗑️ Deleted ${projectCount[0].count} project(s) for user ${user.UserName}`);
        }
        
        // Delete user's media files from database (files will be cleaned up separately)
        const mediaCount = await executeQuery('SELECT COUNT(*) as count FROM media_files WHERE user_id = ?', [userId]);
        if (mediaCount[0].count > 0) {
            await executeQuery('DELETE FROM media_files WHERE user_id = ?', [userId]);
            console.log(`🗑️ Deleted ${mediaCount[0].count} media record(s) for user ${user.UserName}`);
        }
        
        // Delete user
        await executeQuery('DELETE FROM user WHERE UserID = ?', [userId]);
        
        console.log(`🗑️ Admin deleted user: "${user.UserName}" (ID: ${userId})`);
        
        // Perform automatic storage cleanup after user deletion
        const cleanupResult = await performAutomaticStorageCleanup();
        let cleanupMessage = '';
        if (cleanupResult.skipped && cleanupResult.reason === 'active_editing') {
            cleanupMessage = ' (cleanup skipped - users are editing)';
        } else if (cleanupResult.deletedCount > 0) {
            cleanupMessage = ` and cleaned up ${cleanupResult.deletedCount} orphaned file(s)`;
        }
        
        res.json({ 
            success: true, 
            message: `User "${user.UserName}" has been deleted along with ${projectCount[0].count} project(s) and ${mediaCount[0].count} media file(s)${cleanupMessage}`
        });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting user' 
        });
    }
});

// Admin: Clean up orphaned storage files
app.post('/api/admin/storage/cleanup', async (req, res) => {
    try {
        console.log('🧹 Starting storage cleanup...');
        
        // Get all files referenced in the database
        const dbFiles = await executeQuery('SELECT file_path FROM media_files WHERE file_path IS NOT NULL');
        const dbFilePaths = new Set(dbFiles.map(row => {
            // Normalize path - remove leading slash and convert to forward slashes
            let path = row.file_path;
            if (path.startsWith('/')) path = path.substring(1);
            return path.replace(/\\/g, '/');
        }));
        
        console.log(`📊 Found ${dbFilePaths.size} files referenced in database`);
        
        // Recursively scan uploads directory
        const fs = await import('fs');
        const path = await import('path');
        
        const orphanedFiles = [];
        const totalFiles = [];
        
        async function scanDirectory(dirPath, relativePath = '') {
            try {
                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    const relativeFilePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
                    
                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath, relativeFilePath);
                    } else {
                        totalFiles.push(relativeFilePath);
                        
                        // Check if file is referenced in database
                        const uploadRelativePath = relativeFilePath.startsWith('uploads/') 
                            ? relativeFilePath 
                            : `uploads/${relativeFilePath}`;
                            
                        if (!dbFilePaths.has(uploadRelativePath) && !dbFilePaths.has(relativeFilePath)) {
                            orphanedFiles.push({
                                fullPath,
                                relativePath: relativeFilePath,
                                size: (await fs.promises.stat(fullPath)).size
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${dirPath}:`, error.message);
            }
        }
        
        const uploadsDir = path.join(process.cwd(), 'uploads');
        await scanDirectory(uploadsDir, 'uploads');
        
        console.log(`📊 Scanned ${totalFiles.length} total files`);
        console.log(`🗑️ Found ${orphanedFiles.length} orphaned files`);
        
        // Calculate total size of orphaned files
        const totalOrphanedSize = orphanedFiles.reduce((sum, file) => sum + file.size, 0);
        const totalOrphanedSizeMB = (totalOrphanedSize / (1024 * 1024)).toFixed(2);
        
        // If this is just a dry run (default), return the results without deleting
        const isDryRun = req.body.dryRun !== false; // Default to true
        
        if (isDryRun) {
            console.log(`📋 Dry run complete - would delete ${orphanedFiles.length} files (${totalOrphanedSizeMB} MB)`);
            
            return res.json({
                success: true,
                dryRun: true,
                summary: {
                    totalFiles: totalFiles.length,
                    orphanedFiles: orphanedFiles.length,
                    totalOrphanedSize: totalOrphanedSize,
                    totalOrphanedSizeMB: parseFloat(totalOrphanedSizeMB)
                },
                orphanedFiles: orphanedFiles.slice(0, 50).map(file => ({
                    path: file.relativePath,
                    size: file.size,
                    sizeMB: (file.size / (1024 * 1024)).toFixed(2)
                })),
                message: orphanedFiles.length > 50 
                    ? `Showing first 50 of ${orphanedFiles.length} orphaned files. Set dryRun: false to delete them.`
                    : `Found ${orphanedFiles.length} orphaned files. Set dryRun: false to delete them.`
            });
        }
        
        // Actually delete the orphaned files
        let deletedCount = 0;
        let deletedSize = 0;
        const errors = [];
        
        for (const file of orphanedFiles) {
            try {
                await fs.promises.unlink(file.fullPath);
                deletedCount++;
                deletedSize += file.size;
                console.log(`🗑️ Deleted: ${file.relativePath}`);
            } catch (error) {
                console.error(`❌ Failed to delete ${file.relativePath}:`, error.message);
                errors.push({
                    file: file.relativePath,
                    error: error.message
                });
            }
        }
        
        const deletedSizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
        
        console.log(`✅ Storage cleanup complete: deleted ${deletedCount} files (${deletedSizeMB} MB)`);
        
        res.json({
            success: true,
            dryRun: false,
            summary: {
                totalFiles: totalFiles.length,
                orphanedFiles: orphanedFiles.length,
                deletedFiles: deletedCount,
                deletedSize: deletedSize,
                deletedSizeMB: parseFloat(deletedSizeMB),
                errors: errors.length
            },
            errors: errors.length > 0 ? errors.slice(0, 10) : [],
            message: `Deleted ${deletedCount} orphaned files (${deletedSizeMB} MB)${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
        });
        
    } catch (error) {
        console.error('Storage cleanup error:', error);
        res.status(500).json({
            success: false,
            error: 'Storage cleanup failed',
            details: error.message
        });
    }
});

// Admin: Get specific media file info
app.get('/api/admin/media/:mediaId', async (req, res) => {
    const mediaId = req.params.mediaId;

    if (!mediaId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Media ID is required' 
        });
    }

    try {
        const query = `
            SELECT 
                mf.*,
                u.UserName as username,
                u.UserName as owner_name
            FROM media_files mf
            LEFT JOIN user u ON mf.user_id = u.UserID
            WHERE mf.id = ?
        `;
        
        const results = await executeQuery(query, [mediaId]);

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Media file not found' 
            });
        }

        res.json({ 
            success: true, 
            data: results[0]
        });
        
    } catch (error) {
        console.error('Database error getting media file:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Database error occurred' 
        });
    }
});

// Admin: Replace media file
app.post('/api/admin/media/:mediaId/replace', upload.single('file'), async (req, res) => {
    console.log('=== ADMIN REPLACE MEDIA ENDPOINT CALLED ===');
    console.log('mediaId:', req.params.mediaId);
    console.log('body:', req.body);
    console.log('file:', req.file ? req.file.originalname : 'no file');
    
    const mediaId = req.params.mediaId;

    if (!mediaId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Media ID is required' 
        });
    }

    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded' 
        });
    }

    try {
        // Get original media info
        const originalResults = await executeQuery('SELECT * FROM media_files WHERE id = ?', [mediaId]);

        if (originalResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Original media file not found' 
            });
        }

        const originalMedia = originalResults[0];
        
        // Always use new file's name with timestamp to avoid conflicts
        const timestamp = Date.now();
        const ext = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, ext);
        const newFileName = `${timestamp}_${baseName}${ext}`;
        
        // Create new file path
        const newFilePath = `/uploads/user_anonymous/images/${newFileName}`;
        const newFullPath = path.join(uploadsDir, 'user_anonymous', 'images', newFileName);
        
        // Move uploaded file to correct location
        const fs = require('fs');
        try {
            // Ensure directory exists
            const dir = path.dirname(newFullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Move file from temp location to final location
            fs.renameSync(req.file.path, newFullPath);
            
            // Update database record
            await executeQuery(`
                UPDATE media_files 
                SET file_name = ?, 
                    original_name = ?, 
                    file_path = ?, 
                    file_url = ?, 
                    mime_type = ?, 
                    file_size = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                newFileName,
                req.file.originalname,
                newFilePath,
                newFilePath,
                req.file.mimetype,
                req.file.size,
                mediaId
            ]);

            console.log(`Media record updated: ${originalMedia.file_path} -> ${newFilePath}`);

            // Note: project table uses image_id foreign key, so no updates needed there
            // The foreign key relationship will automatically point to the updated media record
            
            // Update references in art table where artcol contains the old filename
            const oldFileName = originalMedia.file_name;
            const artResult = await executeQuery(`
                UPDATE art 
                SET artcol = ? 
                WHERE artcol = ?
            `, [newFileName, oldFileName]);
            
            if (artResult.affectedRows > 0) {
                console.log(`Updated ${artResult.affectedRows} art references`);
            }

            // Delete old file if it exists and is different from new file
            try {
                // Fix: Don't add 'public' prefix since files are stored directly in uploads/
                const oldFullPath = path.join(__dirname, originalMedia.file_path);
                console.log('🗑️ DELETION DEBUG - Old file path:', oldFullPath);
                console.log('🗑️ DELETION DEBUG - New file path:', newFullPath);
                console.log('🗑️ DELETION DEBUG - Old file exists:', fs.existsSync(oldFullPath));
                console.log('🗑️ DELETION DEBUG - Paths different:', oldFullPath !== newFullPath);
                
                if (fs.existsSync(oldFullPath) && oldFullPath !== newFullPath) {
                    fs.unlinkSync(oldFullPath);
                    console.log('✅ Old file deleted successfully:', oldFullPath);
                } else {
                    if (!fs.existsSync(oldFullPath)) {
                        console.log('⚠️ Old file does not exist, skipping deletion:', oldFullPath);
                    }
                    if (oldFullPath === newFullPath) {
                        console.log('⚠️ Old and new paths are the same, skipping deletion');
                    }
                }
            } catch (fileErr) {
                console.warn('❌ Could not delete old file:', fileErr.message);
                // Continue anyway - new file is uploaded and database is updated
            }

            res.json({ 
                success: true, 
                message: 'Media file replaced successfully. All references have been updated.',
                data: {
                    id: mediaId,
                    fileName: newFileName,
                    filePath: newFilePath,
                    originalName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    fileSize: req.file.size,
                    replacedOriginal: originalMedia.file_path
                }
            });
            
        } catch (fileError) {
            console.error('Error handling file:', fileError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to process uploaded file' 
            });
        }
        
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Database error occurred' 
        });
    }
});

// User: Replace their own media file
app.post('/api/media/:mediaId/replace', upload.single('file'), async (req, res) => {
    console.log('=== USER REPLACE MEDIA ENDPOINT CALLED ===');
    console.log('mediaId:', req.params.mediaId);
    console.log('body:', req.body);
    console.log('file:', req.file ? req.file.originalname : 'no file');
    
    const mediaId = req.params.mediaId;
    const userId = req.body.userId; // Get user ID from request body

    if (!mediaId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Media ID is required' 
        });
    }

    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            error: 'User ID is required' 
        });
    }

    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded' 
        });
    }

    try {
        // Get original media info and verify ownership
        const originalResults = await executeQuery('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [mediaId, userId]);

        if (originalResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Media file not found or you do not have permission to replace it' 
            });
        }

        const originalMedia = originalResults[0];
        
        // Always use new file's name with timestamp to avoid conflicts
        const timestamp = Date.now();
        const ext = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, ext);
        const newFileName = `${timestamp}_${baseName}${ext}`;
        
        // Create new file path
        const newFilePath = `/uploads/user_anonymous/images/${newFileName}`;
        const newFullPath = path.join(uploadsDir, 'user_anonymous', 'images', newFileName);
        
        // Move uploaded file to correct location
        const fs = require('fs');
        try {
            // Ensure directory exists
            const dir = path.dirname(newFullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Move file from temp location to final location
            fs.renameSync(req.file.path, newFullPath);
            
            // Update database record
            await executeQuery(`
                UPDATE media_files 
                SET file_name = ?, 
                    original_name = ?, 
                    file_path = ?, 
                    file_url = ?, 
                    mime_type = ?, 
                    file_size = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `, [
                newFileName,
                req.file.originalname,
                newFilePath,
                newFilePath,
                req.file.mimetype,
                req.file.size,
                mediaId,
                userId
            ]);

            console.log(`User media record updated: ${originalMedia.file_path} -> ${newFilePath}`);

            // Check if project approval status needs to be reset for media replacement
            try {
                // Find all projects that use this media file - including card media relationships
                const projectsResult = await executeQuery(`
                    SELECT DISTINCT ProjectID 
                    FROM project 
                    WHERE image_id = ?
                    UNION
                    SELECT DISTINCT p.ProjectID 
                    FROM project p
                    JOIN project_topics pt ON p.ProjectID = pt.project_id
                    JOIN poi ON pt.id = poi.topic_id
                    JOIN card c ON poi.id = c.poi_id
                    JOIN card_media cm ON c.id = cm.Card_ID_FK
                    WHERE cm.Media_ID_FK = ?
                `, [mediaId, mediaId]);
                
                // Reset approval for all projects using this media
                for (const project of projectsResult) {
                    await resetProjectApprovalIfNeeded(project.ProjectID, userId, 'media file replacement');
                }
                
                if (projectsResult.length > 0) {
                    console.log(`Reset approval for ${projectsResult.length} projects due to media replacement`);
                }
            } catch (approvalError) {
                console.error('Error checking approval reset for media replacement:', approvalError);
                // Don't fail the replacement if approval reset fails
            }

            // Note: project table uses image_id foreign key, so no updates needed there
            // The foreign key relationship will automatically point to the updated media record
            
            // Update references in art table where artcol contains the old filename
            // Note: art table doesn't have UserID column based on schema, so we update by filename only
            const oldFileName = originalMedia.file_name;
            const artResult = await executeQuery(`
                UPDATE art 
                SET artcol = ? 
                WHERE artcol = ?
            `, [newFileName, oldFileName]);
            
            if (artResult.affectedRows > 0) {
                console.log(`Updated ${artResult.affectedRows} art references for user ${userId}`);
            }

            // Delete old file if it exists and is different from new file
            try {
                // Fix: Don't add 'public' prefix since files are stored directly in uploads/
                const oldFullPath = path.join(__dirname, originalMedia.file_path);
                console.log('🗑️ USER DELETION DEBUG - Old file path:', oldFullPath);
                console.log('🗑️ USER DELETION DEBUG - New file path:', newFullPath);
                console.log('🗑️ USER DELETION DEBUG - Old file exists:', fs.existsSync(oldFullPath));
                console.log('🗑️ USER DELETION DEBUG - Paths different:', oldFullPath !== newFullPath);
                
                if (fs.existsSync(oldFullPath) && oldFullPath !== newFullPath) {
                    fs.unlinkSync(oldFullPath);
                    console.log('✅ Old file deleted successfully:', oldFullPath);
                } else {
                    if (!fs.existsSync(oldFullPath)) {
                        console.log('⚠️ Old file does not exist, skipping deletion:', oldFullPath);
                    }
                    if (oldFullPath === newFullPath) {
                        console.log('⚠️ Old and new paths are the same, skipping deletion');
                    }
                }
            } catch (fileErr) {
                console.warn('❌ Could not delete old file:', fileErr.message);
                // Continue anyway - new file is uploaded and database is updated
            }

            res.json({ 
                success: true, 
                message: 'Media file replaced successfully. All references have been updated.',
                data: {
                    id: mediaId,
                    fileName: newFileName,
                    filePath: newFilePath,
                    originalName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    fileSize: req.file.size,
                    replacedOriginal: originalMedia.file_path
                }
            });
            
        } catch (fileError) {
            console.error('Error handling file:', fileError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to process uploaded file' 
            });
        }
        
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Database error occurred' 
        });
    }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.listen(PORT, async () => {
  console.log(`🚀 SMARTArt API Server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  
  // Test database connection
  await testConnection();
});