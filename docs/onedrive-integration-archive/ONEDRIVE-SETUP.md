# OneDrive Integration Setup Guide

## Overview

This system supports two modes for OneDrive integration:

1. **Service Account Mode** (Recommended): All files stored in a single OneDrive account
2. **User Account Mode**: Each user connects their own OneDrive account

## Service Account Mode (Single Account for All Files)

This is the recommended setup where all media files are stored in one designated OneDrive account.

### Step 1: Create Azure App Registration
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `SMARTArt Database OneDrive Integration`
   - **Supported account types**: `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI**: `Web` - `http://localhost:8080/auth/onedrive/callback`

### Step 2: Get Credentials
1. After creating the app, copy the **Application (client) ID**
2. Go to **Certificates & secrets** > **New client secret**
3. Create a secret and copy its **Value** (not the ID)

### Step 3: Set Permissions
1. Go to **API permissions** > **Add a permission**
2. Select **Microsoft Graph** > **Delegated permissions**
3. Add these permissions:
   - `Files.ReadWrite.All` (Read and write access to all files)
   - `offline_access` (Maintain access to data)

## 2. Environment Configuration

Update your `.env` file with the Azure app credentials:

```env
# OneDrive API Configuration
ONEDRIVE_CLIENT_ID=your-application-client-id-here
ONEDRIVE_CLIENT_SECRET=your-client-secret-value-here
ONEDRIVE_REDIRECT_URI=http://localhost:8080/auth/onedrive/callback

# OneDrive Folder Organization
ONEDRIVE_DEFAULT_FOLDER=/SMARTArt
ONEDRIVE_ORGANIZE_BY_USER=true
ONEDRIVE_ORGANIZE_BY_DATE=false
ONEDRIVE_ORGANIZE_BY_TYPE=true
```

## 3. Folder Organization Options

### Configuration Variables:

- **`ONEDRIVE_DEFAULT_FOLDER`**: Base folder for all uploads (default: `/SMARTArt`)
- **`ONEDRIVE_ORGANIZE_BY_USER`**: Create user-specific subfolders (default: `true`)
- **`ONEDRIVE_ORGANIZE_BY_DATE`**: Organize by year/month (default: `false`)
- **`ONEDRIVE_ORGANIZE_BY_TYPE`**: Separate by file type (images/videos/audio) (default: `true`)

### Example Folder Structures:

#### Option 1: Organized by User and Type
```
/SMARTArt/
├── user_1/
│   ├── images/
│   ├── videos/
│   └── audio/
├── user_2/
│   ├── images/
│   └── videos/
```

#### Option 2: Organized by Date
```
/SMARTArt/
├── 2025/
│   ├── 01/
│   ├── 02/
│   └── 07/
│       ├── images/
│       └── videos/
```

#### Option 3: Simple Structure
```
/SMARTArt/
├── all files here
```

## 4. Account Selection

The OneDrive account used is determined by:

1. **OAuth Authentication**: When users click "Connect OneDrive", they'll be redirected to Microsoft login
2. **User Choice**: They can choose which Microsoft account to use during login
3. **Session Storage**: The access token is tied to that specific account

### Multiple Account Support:
- Each user authenticates with their own OneDrive account
- Files are stored in the authenticated user's OneDrive
- No mixing of accounts or files

## 5. Custom Folder Paths

You can specify custom folders programmatically:

### Frontend Upload Options:
```javascript
// Upload to custom path
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('customPath', '/MyProject/Assets');
formData.append('organizeByType', 'true');
formData.append('userId', currentUser.id);

fetch('/api/onedrive/upload', {
    method: 'POST',
    body: formData
});
```

### Backend Upload Options:
```javascript
// Upload with custom organization
const result = await oneDriveService.uploadFile(fileName, buffer, {
    customPath: '/SpecialProject',
    userId: 123,
    fileType: 'image/jpeg'
});
```

## 6. Security Considerations

- **Access Tokens**: Stored temporarily in memory, not persisted
- **User Isolation**: Each user only accesses their own OneDrive
- **File Permissions**: Determined by OneDrive account permissions
- **API Limits**: Subject to Microsoft Graph API rate limits

## 7. Testing the Integration

1. **Start the server**: `npm start`
2. **Login to your app**: Use the dashboard
3. **Click "Connect OneDrive"**: Authenticate with Microsoft
4. **Upload a file**: Test the upload functionality
5. **Check OneDrive**: Verify files appear in the correct folder structure

## 8. Troubleshooting

### Common Issues:

1. **Invalid Client**: Check your `ONEDRIVE_CLIENT_ID` and `ONEDRIVE_CLIENT_SECRET`
2. **Redirect URI Mismatch**: Ensure the redirect URI in Azure matches your `.env`
3. **Permission Denied**: Verify the required permissions are granted in Azure
4. **Token Expired**: The app automatically refreshes tokens when needed

### Debug Mode:
Set `NODE_ENV=development` in your `.env` file for detailed error logging.
