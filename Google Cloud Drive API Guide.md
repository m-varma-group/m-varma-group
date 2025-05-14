# Google Cloud Project for Drive API

## 🔧 1.1: Create a Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Click the project dropdown > **"New Project"**
- Name it something like **SecureDriveManager**
- Click **Create**

## 🔧 1.2: Enable Google Drive API
- In your new project, go to **APIs & Services > Library**
- Search for **“Google Drive API”**
- Click it, then click **Enable**

## 🔧 1.3: Configure OAuth Consent Screen
- Go to **APIs & Services > OAuth consent screen**
- Choose **External** (for public access)
- Fill in:
  1. App name  
  2. Support email  
  3. Developer contact  

- Under **Scopes**, click **Add or Remove Scopes**
- Select:
  1. `../auth/drive`  
  2. `../auth/drive.file`  
  3. `../auth/drive.metadata.readonly`  

- Save and continue until it’s published

## 🔧 1.4: Create OAuth 2.0 Credentials
- Go to **APIs & Services > Credentials**
- Click **Create Credentials > OAuth Client ID**
- Choose **Web application**
- Add:
  1. **Name**: `WebClient`  
  2. **Authorized JavaScript origins**: `https://example.com` (for dev)  
  3. **Authorized redirect URIs**: `https://example.com/oauth2/callback`  

- Save and copy your:
  1. **Client ID**  
  2. **Client Secret**
