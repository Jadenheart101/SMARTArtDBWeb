const axios = require('axios');
require('dotenv').config();

class OneDriveService {
    constructor() {
        this.clientId = process.env.ONEDRIVE_CLIENT_ID;
        this.clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
        this.redirectUri = process.env.ONEDRIVE_REDIRECT_URI || 'http://localhost:8080/auth/onedrive/callback';
        this.accessToken = null;
        this.refreshToken = null;
        
        // Default folder configuration
        this.defaultFolderPath = process.env.ONEDRIVE_DEFAULT_FOLDER || '/SMARTArt';
        this.organizeFoldersByUser = process.env.ONEDRIVE_ORGANIZE_BY_USER === 'true' || true;
        this.organizeFoldersByDate = process.env.ONEDRIVE_ORGANIZE_BY_DATE === 'true' || false;
        
        // Service account mode - single account for all users
        this.useServiceAccount = process.env.ONEDRIVE_USE_SERVICE_ACCOUNT === 'true' || true;
        this.serviceAccountToken = process.env.ONEDRIVE_SERVICE_TOKEN || null;
        this.serviceAccountRefreshToken = process.env.ONEDRIVE_SERVICE_REFRESH_TOKEN || null;
        
        // If in service account mode, use the service account tokens
        if (this.useServiceAccount && this.serviceAccountToken) {
            this.accessToken = this.serviceAccountToken;
            this.refreshToken = this.serviceAccountRefreshToken;
        }
    }

    // Get OAuth2 authorization URL
    getAuthUrl() {
        const scope = 'Files.ReadWrite.All offline_access';
        const responseType = 'code';
        
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
               `client_id=${this.clientId}&` +
               `response_type=${responseType}&` +
               `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
               `scope=${encodeURIComponent(scope)}&` +
               `response_mode=query`;
    }

    // Exchange authorization code for access token
    async getAccessToken(code) {
        try {
            const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code'
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            this.refreshToken = response.data.refresh_token;
            
            // If this is for service account mode, log the tokens for .env setup
            if (this.useServiceAccount && !this.serviceAccountToken) {
                console.log('🔑 Service Account Tokens (add to .env):');
                console.log(`ONEDRIVE_SERVICE_TOKEN=${this.accessToken}`);
                console.log(`ONEDRIVE_SERVICE_REFRESH_TOKEN=${this.refreshToken}`);
                console.log('⚠️  Store these tokens securely in your .env file!');
            }
            
            return {
                success: true,
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                expiresIn: response.data.expires_in
            };
        } catch (error) {
            console.error('Error getting access token:', error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token'
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            if (response.data.refresh_token) {
                this.refreshToken = response.data.refresh_token;
            }

            return { success: true, accessToken: this.accessToken };
        } catch (error) {
            console.error('Error refreshing token:', error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    // Upload file to OneDrive
    async uploadFile(fileName, fileBuffer, options = {}) {
        if (!this.accessToken) {
            throw new Error('No access token. Please authenticate first.');
        }

        const {
            folderPath = null,
            userId = null,
            fileType = null,
            customPath = null
        } = options;

        try {
            // Get the appropriate folder path
            const targetPath = folderPath || this.getFolderPath(userId, customPath, fileType);
            
            // Create folder if it doesn't exist
            await this.createFolder(targetPath);

            // Upload file
            const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${targetPath}/${fileName}:/content`;
            
            const response = await axios.put(uploadUrl, fileBuffer, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/octet-stream'
                }
            });

            return {
                success: true,
                fileId: response.data.id,
                fileName: response.data.name,
                downloadUrl: response.data['@microsoft.graph.downloadUrl'],
                webUrl: response.data.webUrl,
                size: response.data.size,
                folderPath: targetPath
            };
        } catch (error) {
            console.error('Error uploading file:', error.response?.data || error.message);
            
            // Try to refresh token if unauthorized
            if (error.response?.status === 401) {
                const refreshResult = await this.refreshAccessToken();
                if (refreshResult.success) {
                    // Retry upload with new token
                    return this.uploadFile(fileName, fileBuffer, options);
                }
            }
            
            return { success: false, error: error.response?.data || error.message };
        }
    }

    // Create folder in OneDrive
    async createFolder(folderPath) {
        try {
            const pathParts = folderPath.split('/').filter(part => part);
            let currentPath = '';

            for (const part of pathParts) {
                currentPath += `/${part}`;
                
                try {
                    await axios.get(`https://graph.microsoft.com/v1.0/me/drive/root:${currentPath}`, {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`
                        }
                    });
                } catch (error) {
                    if (error.response?.status === 404) {
                        // Folder doesn't exist, create it
                        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
                        const folderName = part;

                        await axios.post(`https://graph.microsoft.com/v1.0/me/drive/root:${parentPath}:/children`, {
                            name: folderName,
                            folder: {},
                            '@microsoft.graph.conflictBehavior': 'rename'
                        }, {
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error creating folder:', error.response?.data || error.message);
        }
    }

    // Download file from OneDrive
    async downloadFile(fileId) {
        if (!this.accessToken) {
            throw new Error('No access token. Please authenticate first.');
        }

        try {
            const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                responseType: 'arraybuffer'
            });

            return {
                success: true,
                buffer: Buffer.from(response.data),
                contentType: response.headers['content-type']
            };
        } catch (error) {
            console.error('Error downloading file:', error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    // Get file info from OneDrive
    async getFileInfo(fileId) {
        if (!this.accessToken) {
            throw new Error('No access token. Please authenticate first.');
        }

        try {
            const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return {
                success: true,
                file: {
                    id: response.data.id,
                    name: response.data.name,
                    size: response.data.size,
                    mimeType: response.data.file?.mimeType,
                    downloadUrl: response.data['@microsoft.graph.downloadUrl'],
                    webUrl: response.data.webUrl,
                    createdDateTime: response.data.createdDateTime,
                    lastModifiedDateTime: response.data.lastModifiedDateTime
                }
            };
        } catch (error) {
            console.error('Error getting file info:', error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    // List files in OneDrive folder
    async listFiles(folderPath = '/SMARTArt') {
        if (!this.accessToken) {
            throw new Error('No access token. Please authenticate first.');
        }

        try {
            const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/root:${folderPath}:/children`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return {
                success: true,
                files: response.data.value.map(file => ({
                    id: file.id,
                    name: file.name,
                    size: file.size,
                    mimeType: file.file?.mimeType,
                    downloadUrl: file['@microsoft.graph.downloadUrl'],
                    webUrl: file.webUrl,
                    createdDateTime: file.createdDateTime,
                    lastModifiedDateTime: file.lastModifiedDateTime
                }))
            };
        } catch (error) {
            console.error('Error listing files:', error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    // Delete file from OneDrive
    async deleteFile(fileId) {
        if (!this.accessToken) {
            throw new Error('No access token. Please authenticate first.');
        }

        try {
            await axios.delete(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    // Get folder path for a specific user and optional subfolder
    getFolderPath(userId = null, customPath = null, fileType = null) {
        let basePath = customPath || this.defaultFolderPath;
        
        // Ensure path starts with /
        if (!basePath.startsWith('/')) {
            basePath = '/' + basePath;
        }
        
        // Add user-specific folder if enabled
        if (this.organizeFoldersByUser && userId) {
            basePath += `/user_${userId}`;
        }
        
        // Add date-based organization if enabled
        if (this.organizeFoldersByDate) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            basePath += `/${year}/${month}`;
        }
        
        // Add file type organization if specified
        if (fileType) {
            if (fileType.startsWith('image/')) {
                basePath += '/images';
            } else if (fileType.startsWith('video/')) {
                basePath += '/videos';
            } else if (fileType.startsWith('audio/')) {
                basePath += '/audio';
            } else {
                basePath += '/files';
            }
        }
        
        return basePath;
    }
    
    // Check if service account is configured and ready
    isServiceAccountReady() {
        return this.useServiceAccount && this.serviceAccountToken && this.serviceAccountRefreshToken;
    }
    
    // Get authentication status
    getAuthStatus() {
        if (this.useServiceAccount) {
            return {
                mode: 'service_account',
                ready: this.isServiceAccountReady(),
                hasToken: !!this.accessToken,
                message: this.isServiceAccountReady() 
                    ? 'Service account configured and ready' 
                    : 'Service account tokens not configured'
            };
        } else {
            return {
                mode: 'user_auth',
                ready: !!this.accessToken,
                hasToken: !!this.accessToken,
                message: this.accessToken 
                    ? 'User authenticated' 
                    : 'User authentication required'
            };
        }
    }
}

module.exports = OneDriveService;
