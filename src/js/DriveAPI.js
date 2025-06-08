import axios from 'axios'; // Used for upload with progress tracking

// Fetches all files within a given Google Drive folder
export const fetchDriveFiles = async (folderId, token) => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,parents,size,modifiedTime,createdTime)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    return data.files || []; // Return files array or empty array
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return [];
  }
};

// Fetches the authenticated user's Google profile info
export const fetchUserInfo = async (token) => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
};

// Creates a new folder in Google Drive under the specified parent folder
export const createFolder = async (name, parentId, token) => {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder', // Required to create a folder
        parents: [parentId],
      }),
    });
    if (!res.ok) throw new Error('Failed to create folder');
    return await res.json(); // Return folder details
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
};

// Uploads multiple files to a specific Google Drive folder
export const uploadFiles = async (
  fileList,        // Array of File objects to upload
  existingFiles,   // Current files in the folder (for duplicate name checking)
  folderId,        // Target folder ID
  token,           // OAuth token
  onProgress       // Callback for reporting upload progress
) => {
  // Helper function to resolve duplicate file names by appending (1), (2), etc.
  const getUniqueName = (originalName) => {
    const nameParts = originalName.split('.');
    const extension = nameParts.length > 1 ? '.' + nameParts.pop() : '';
    const baseName = nameParts.join('.');
    let counter = 1;
    let uniqueName = originalName;
    const existingNames = existingFiles.map((f) => f.name);
    while (existingNames.includes(uniqueName)) {
      uniqueName = `${baseName} (${counter})${extension}`;
      counter++;
    }
    return uniqueName;
  };

  // Uploads a single file to Drive using multipart upload
  const uploadSingleFile = async (file) => {
    const uniqueName = getUniqueName(file.name); // Ensure unique name
    const metadata = {
      name: uniqueName,
      parents: [folderId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
      await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // Track upload progress and report via callback
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(file.name, percent);
            }
          },
        }
      );
    } catch (error) {
      console.error(`Upload failed for ${file.name}:`, error);
      throw error;
    }
  };

  // Upload all files in parallel
  const uploadPromises = fileList.map((file) => uploadSingleFile(file));
  await Promise.all(uploadPromises);
};

// Deletes a single file from Google Drive
export const deleteFile = async (fileId, token) => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete file');
  } catch (error) {
    console.error(`Delete failed for file ${fileId}:`, error);
    throw error;
  }
};

// Deletes multiple files concurrently from Google Drive
export const deleteMultipleFiles = async (fileIds, token) => {
  try {
    const deletePromises = fileIds.map((fileId) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const results = await Promise.all(deletePromises);
    // Check for any failed deletions
    for (const res of results) {
      if (!res.ok) throw new Error('Failed to delete some files');
    }
  } catch (error) {
    console.error('Delete multiple files error:', error);
    throw error;
  }
};
