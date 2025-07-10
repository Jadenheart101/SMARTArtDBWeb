# OneDrive Service Account Setup

## Quick Setup for Single Account Storage

All media files will be stored in **one** OneDrive account instead of individual user accounts.

## Step 1: Azure App Setup

1. Go to [Azure Portal](https://portal.azure.com/) → **App registrations** → **New registration**
2. Create app with these settings:
   - **Name**: `SMARTArt OneDrive Storage`
   - **Account types**: `Personal Microsoft accounts only` (or broader if needed)
   - **Redirect URI**: `http://localhost:8080/auth/onedrive/callback`

3. Get your credentials:
   - Copy **Application (client) ID**
   - Create **Client secret** and copy the value

4. Set permissions:
   - **API permissions** → **Microsoft Graph** → **Delegated permissions**
   - Add: `Files.ReadWrite.All` and `offline_access`

## Step 2: Environment Configuration

Update your `.env` file:

```env
# Azure App Credentials
ONEDRIVE_CLIENT_ID=your-client-id-here
ONEDRIVE_CLIENT_SECRET=your-client-secret-here
ONEDRIVE_REDIRECT_URI=http://localhost:8080/auth/onedrive/callback

# Enable Service Account Mode
ONEDRIVE_USE_SERVICE_ACCOUNT=true
ONEDRIVE_SERVICE_TOKEN=
ONEDRIVE_SERVICE_REFRESH_TOKEN=

# Folder Organization
ONEDRIVE_DEFAULT_FOLDER=/SMARTArt
ONEDRIVE_ORGANIZE_BY_USER=true
ONEDRIVE_ORGANIZE_BY_TYPE=true
```

## Step 3: Get Service Account Tokens

1. Start your server: `npm start`

2. **Important**: Authenticate once with the OneDrive account for storage:
   - Open your app and login
   - Go to dashboard → Click "Connect OneDrive"
   - **Login with the Microsoft account you want to use for storage**
   - Check server console for tokens

3. Copy the tokens from console output and update `.env`:
```env
ONEDRIVE_SERVICE_TOKEN=EwBwA8l6BAAUbDba3x2OMJElkwdpS...
ONEDRIVE_SERVICE_REFRESH_TOKEN=M.R3_BAY.-CRbIb...
```

4. Restart server: `npm start`

## Done! 

Now all users' media uploads will be stored in the single OneDrive account, organized by user folders:

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

## Security Notes

- The service account tokens give access to ONE OneDrive account
- Users can't access each other's files (controlled by your app logic)
- Files are organized by user ID for separation
- Tokens are stored securely in environment variables

## Troubleshooting

- **"Service account not configured"**: Check that tokens are in `.env` file
- **"Authentication failed"**: Verify client ID/secret are correct
- **"Permission denied"**: Ensure API permissions are granted in Azure
- **Tokens expired**: The system auto-refreshes tokens, but you may need to re-authenticate if refresh token expires
