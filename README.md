# SMARTArt Database Web Application

A web-based database management system for art projects with secure user authentication, role-based access control, and local media file storage.

## Features

- **User Authentication**: Secure login system with role-based access (admin/user)
- **Personalized Dashboard**: User-specific interface with stats and navigation
- **Media Management**: Local storage for images, audio, and video files
- **Gallery System**: Browse and manage artwork collections
- **Role-Based Access**: Admins can view all data, users see their own content
- **Responsive Design**: Mobile-friendly interface with modern CSS

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Database**
   - Configure your database connection in `.env`
   - Run the database setup scripts:
     ```bash
     node database_setup.sql
     node media_files_table.sql
     ```

3. **Configure Environment**
   - Copy `.env.example` to `.env` (if available)
   - Update database credentials and server settings

4. **Start the Application**
   ```bash
   npm start
   ```

5. **Access the Application**
   - Open your browser to `http://localhost:8080`
   - Log in with your credentials

## Project Structure

```
├── public/                 # Frontend files
│   ├── components/         # HTML components
│   ├── css/               # Modular CSS files
│   ├── index.html         # Main HTML file
│   ├── script.js          # Main JavaScript
│   └── style.css          # Global styles
├── uploads/               # Local media storage
├── docs/                  # Documentation
├── database.js            # Database connection
├── index.js              # Main server file
└── README.md             # This file
```

## Media Storage

Files are stored locally in the `uploads/` directory with the following organization:

```
uploads/
├── user_1/
│   ├── images/
│   ├── videos/
│   ├── audio/
│   └── files/
└── user_2/
    └── images/
```

For more details, see [LOCAL-STORAGE-SETUP.md](LOCAL-STORAGE-SETUP.md).

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Media Management
- `POST /api/media/upload` - Upload media files
- `GET /api/media/files` - List all files (admin)
- `GET /api/users/:userId/media` - List user's files
- `GET /api/media/file/:fileId` - Get file info
- `DELETE /api/media/file/:fileId` - Delete file

### Database
- `GET /api/users` - List users (admin)
- `GET /api/projects` - List projects
- `GET /api/artworks` - List artworks

## Configuration

Environment variables in `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database

# Server Configuration
PORT=8080
NODE_ENV=development

# Local File Storage Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600
```

## Development

### File Structure
- **Frontend**: Modular components in `public/components/`
- **CSS**: Organized by component in `public/css/`
- **Backend**: Express.js server with database integration
- **Media**: Local file storage with multer

### Key Components
- **Dashboard**: User-specific landing page
- **Gallery**: Media browsing and management
- **Auth Modal**: Secure login interface
- **Responsive Design**: Mobile-first CSS architecture

## Security Features

- **Role-Based Access**: Admin vs. user permissions
- **File Type Validation**: Only approved media types
- **File Size Limits**: Configurable upload limits
- **User Isolation**: Users only access their own files
- **Secure Authentication**: Protected routes and sessions

## Dependencies

- **Express.js**: Web framework
- **Multer**: File upload handling
- **MySQL**: Database (configurable)
- **dotenv**: Environment configuration

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- ES6+ JavaScript features

## Documentation

- [Local Storage Setup](LOCAL-STORAGE-SETUP.md) - Media file configuration
- [Component Documentation](README-components.md) - Frontend architecture
- [CSS Structure](README-css-structure.md) - Styling organization

## Legacy/Archive

OneDrive integration files have been moved to `docs/onedrive-integration-archive/` for reference.

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]
