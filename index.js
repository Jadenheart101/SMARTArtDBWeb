const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

const app = express();
const PORT = process.env.PORT || 8080;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

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

// Serve static files from public directory
app.use(express.static('public'));

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
      'GET /api/users/:userId/media': 'Get user media files'
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
  
  if (!ArtistName || !ArtName) {
    return res.status(400).json({ success: false, message: 'ArtistName and ArtName are required' });
  }
  
  try {
    // Get next available ArtId
    const nextArtId = await getNextAvailableId('art', 'ArtId');
    
    const result = await executeQuery(
      'INSERT INTO art (ArtId, ArtistName, Submitor, Date, ArtMedia, ArtName, artcol) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nextArtId, ArtistName, Submitor || null, artDate || new Date().toISOString().split('T')[0], ArtMedia || null, ArtName, artcol || null]
    );
    
    const newArtwork = await executeQuery('SELECT * FROM art WHERE ArtId = ?', [nextArtId]);
    res.status(201).json({ success: true, data: newArtwork[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating artwork', error: error.message });
  }
});

app.put('/api/art/:id', async (req, res) => {
  const { ArtistName, Submitor, Date: artDate, ArtMedia, ArtName, artcol } = req.body;
  
  try {
    const result = await executeQuery(
      'UPDATE art SET ArtistName = ?, Submitor = ?, Date = ?, ArtMedia = ?, ArtName = ?, artcol = ? WHERE ArtId = ?',
      [ArtistName, Submitor, artDate, ArtMedia, ArtName, artcol, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
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
      ImageName: project.media_display_name || project.file_name
    }));
    
    res.json({ success: true, data: mappedProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching projects', error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  const { ProjectName, Approved, NeedsReview, user_id } = req.body;
  if (!ProjectName || !user_id) {
    return res.status(400).json({ success: false, message: 'ProjectName and user_id are required' });
  }
  try {
    // Get next available ProjectID
    const nextProjectId = await getNextAvailableId('project', 'ProjectID');
    
    const today = new Date().toISOString().split('T')[0];
    const result = await executeQuery(
      'INSERT INTO project (ProjectID, ProjectName, user_id, Approved, NeedsReview, DateCreated, DateModified) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nextProjectId, ProjectName, user_id, Approved || 0, NeedsReview || 1, today, today]
    );
    const newProject = await executeQuery('SELECT * FROM project WHERE ProjectID = ?', [nextProjectId]);
    res.status(201).json({ success: true, data: newProject[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating project', error: error.message });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { ProjectName, Description, ImageID } = req.body;
    
    if (!ProjectName) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }
    
    const updateFields = ['ProjectName = ?'];
    const updateValues = [ProjectName];
    
    if (Description !== undefined) {
      updateFields.push('Description = ?');
      updateValues.push(Description);
    }
    
    if (ImageID !== undefined) {
      updateFields.push('image_id = ?');
      updateValues.push(ImageID);
    }
    
    updateFields.push('DateModified = ?');
    updateValues.push(new Date().toISOString().split('T')[0]);
    
    updateValues.push(projectId);
    
    const result = await executeQuery(
      `UPDATE project SET ${updateFields.join(', ')} WHERE ProjectID = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    res.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Error updating project', error: error.message });
  }
});

// Get single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
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
    
    const projects = await executeQuery(query, [projectId]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const project = projects[0];
    
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
      ImageName: project.media_display_name || project.file_name
    };
    
    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Error fetching project:', error);
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
    
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Error deleting project', error: error.message });
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
  try {
    if (!req.file) {
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
    
    // Generate file URL
    const relativePath = path.relative(uploadsDir, filePath);
    const fileUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    try {
      // Generate a unique file_id for this upload
      const uniqueFileId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get next available media file ID
      const nextMediaId = await getNextAvailableId('media_files', 'id');
      
      console.log('Inserting media record:', {
        id: nextMediaId,
        user_id: parsedUserId,
        file_name: filename,
        original_name: originalname,
        displayName: customName || null,
        file_id: uniqueFileId,
        file_path: filePath,
        file_url: fileUrl,
        mime_type: mimetype,
        file_size: size
      });
      
      // Store file info in database
      const result = await executeQuery(
        'INSERT INTO media_files (id, user_id, file_name, original_name, displayName, file_id, file_path, file_url, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nextMediaId, parsedUserId, filename, originalname, customName || null, uniqueFileId, filePath, fileUrl, mimetype, size]
      );
      
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
      console.error('Error storing file info in database:', dbError);
      // Delete the uploaded file if database insert fails
      fs.unlinkSync(filePath);
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
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    const files = await executeQuery(
      'SELECT * FROM media_files WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    // Check if files still exist on disk and clean up database if not
    const validFiles = [];
    for (const file of files) {
      // Only check file existence if file_path is provided (for local files)
      const fileExists = !file.file_path || fs.existsSync(file.file_path);
      
      if (fileExists) {
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
    
    const files = await executeQuery('SELECT * FROM media_files WHERE id = ?', [fileId]);
    
    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const file = files[0];
    
    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      // Remove from database if file doesn't exist
      await executeQuery('DELETE FROM media_files WHERE id = ?', [fileId]);
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }
    
    res.json({
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
    });
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
      
      res.json({ success: true, message: 'File deleted successfully' });
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
    
    // Get topics for the project using project_topics table
    const topics = await executeQuery(
      'SELECT *, id as TopicID, project_id as ProjectID_FK, topic_title as Label FROM project_topics WHERE project_id = ? ORDER BY topic_order, id',
      [projectId]
    );
    
    // For each topic, get its POIs and cards
    const topicsWithContent = await Promise.all(topics.map(async (topic) => {
      // Get POIs for this topic (using actual column names)
      const pois = await executeQuery(
        'SELECT *, id as POIID, topic_id as TopicID_FK, x_coordinate as XCoord, y_coordinate as YCoord FROM poi WHERE topic_id = ? ORDER BY id',
        [topic.TopicID]
      );
      
      // For each POI, get its cards (using actual column names)
      const poisWithCards = await Promise.all(pois.map(async (poi) => {
        const cards = await executeQuery(
          'SELECT *, id as CardID, poi_id as POIID_FK, card_title as Title, card_content as Body FROM card WHERE poi_id = ? ORDER BY card_order, id',
          [poi.POIID]
        );
        
        // For each card, get its media
        const cardsWithMedia = await Promise.all(cards.map(async (card) => {
          const media = await executeQuery(`
            SELECT mf.*, cm.Card_Media_ID 
            FROM card_media cm
            JOIN media_files mf ON cm.Media_ID_FK = mf.id
            WHERE cm.Card_ID_FK = ?
          `, [card.CardID]);
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
    
    res.json({ success: true, data: topicsWithContent });
  } catch (error) {
    console.error('Error fetching project topics:', error);
    res.status(500).json({ success: false, message: 'Error fetching project topics', error: error.message });
  }
});

// Create project topic
app.post('/api/projects/:id/topics', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { Label, topic_title, topic_content } = req.body;
    
    const title = topic_title || Label || 'New Topic';
    const content = topic_content || '';
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Topic title is required' });
    }
    
    // Get next available topic ID
    const nextTopicId = await getNextAvailableId('project_topics', 'id');
    
    const result = await executeQuery(
      'INSERT INTO project_topics (id, project_id, topic_title, topic_content, topic_order) VALUES (?, ?, ?, ?, ?)',
      [nextTopicId, projectId, title, content, 0]
    );
    
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
    const { Label, topic_title, topic_content, is_expanded } = req.body;
    
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
    const { XCoord, YCoord, pImage, pLocation, poi_title, poi_content } = req.body;
    
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
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateValues.push(poiId);
    
    const result = await executeQuery(
      `UPDATE poi SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'POI not found' });
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
    const { Title, Body, Type, Notes, References, card_title, card_content, card_order } = req.body;
    
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
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateValues.push(cardId);
    
    const result = await executeQuery(
      `UPDATE card SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }
    
    const updatedCard = await executeQuery('SELECT *, id as CardID, poi_id as POIID_FK, card_title as Title, card_content as Body FROM card WHERE id = ?', [cardId]);
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