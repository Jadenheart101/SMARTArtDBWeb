# Local File Storage Setup

## Overview

The SMARTArt Database application now uses local file storage for media files (images, audio, and video). Files are stored on the server's file system and served via static file routes.

## Configuration

The application uses the following configuration in your `.env` file:

```env
# Local File Storage Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600  # 100MB in bytes
```

## File Organization

Files are automatically organized in the following structure:

```
uploads/
├── user_1/
│   ├── images/
│   ├── videos/
│   ├── audio/
│   └── files/
├── user_2/
│   ├── images/
│   └── videos/
└── user_anonymous/
    ├── images/
    └── files/
```

### Directory Structure Details:

- **User Folders**: Each user gets their own folder (`user_{userId}`)
- **Type Folders**: Files are separated by type:
  - `images/` - JPEG, PNG, GIF, BMP, WebP
  - `videos/` - MP4, AVI, MOV, WMV, WebM
  - `audio/` - MP3, WAV, FLAC, AAC
  - `files/` - Other supported file types

## File Naming

Uploaded files are automatically renamed with:
- Timestamp prefix for uniqueness
- Original filename (sanitized)
- Original file extension

Example: `1720649123456_my-photo.jpg`

## API Endpoints

### Upload File
- **POST** `/api/media/upload`
- **Body**: `multipart/form-data` with `file` and `userId`
- **Response**: File metadata including path and URL

### List User Files
- **GET** `/api/users/:userId/media`
- **Response**: Array of user's media files

### Get All Files
- **GET** `/api/media/files`
- **Response**: Array of all media files (admin access)

### Get File Info
- **GET** `/api/media/file/:fileId`
- **Response**: Specific file metadata

### Delete File
- **DELETE** `/api/media/file/:fileId`
- **Response**: Success/error message

## File Access

Uploaded files are served statically at:
```
http://localhost:8080/uploads/user_{userId}/{type}/{filename}
```

Example:
```
http://localhost:8080/uploads/user_1/images/1720649123456_my-photo.jpg
```

## Security Considerations

- **File Type Validation**: Only images, audio, and video files are allowed
- **File Size Limits**: 100MB maximum file size
- **User Isolation**: Files are organized by user folders
- **File Sanitization**: Filenames are sanitized and made unique

## Storage Requirements

- **Disk Space**: Monitor available disk space as files are stored locally
- **Backup**: Consider implementing backup strategies for the `uploads` directory
- **Cleanup**: Implement cleanup routines for orphaned files if needed

## Migration from OneDrive

If you previously used OneDrive integration, the old setup files have been moved to:
```
docs/onedrive-integration-archive/
├── onedrive-service.js
├── ONEDRIVE-SETUP.md
└── SERVICE-ACCOUNT-SETUP.md
```

These files are kept for reference but are not used in the current local storage implementation. All OneDrive-related configuration has been removed from the `.env` file and replaced with local storage settings.

## Production Considerations

- **Storage Location**: Consider using a separate volume or storage service in production
- **CDN**: For better performance, consider using a CDN for file delivery
- **Monitoring**: Monitor disk usage and implement alerts
- **Backups**: Regular backups of the uploads directory
