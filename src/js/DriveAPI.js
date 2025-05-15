import axios from 'axios';

export const fetchDriveFiles = async (folderId, token) => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,parents,size,modifiedTime,createdTime)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Failed to fetch files:', error);
    throw error;
  }
};

export const fetchUserInfo = async (token) => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    throw error;
  }
};

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
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });
    if (!res.ok) throw new Error('Failed to create folder');
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

export const uploadFiles = async (
  fileList,
  existingFiles,
  folderId,
  token,
  onProgress
) => {
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

  const uploadSingleFile = async (file) => {
    try {
      const uniqueName = getUniqueName(file.name);
      const metadata = {
        name: uniqueName,
        parents: [folderId],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(file.name, percent);
            }
          },
        }
      );
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw error;
    }
  };

  for (const file of fileList) {
    await uploadSingleFile(file);
  }
};

export const deleteFile = async (fileId, token) => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete file');
  } catch (error) {
    console.error(`Error deleting file ${fileId}:`, error);
    throw error;
  }
};

export const deleteMultipleFiles = async (fileIds, token) => {
  try {
    const deletePromises = fileIds.map((fileId) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const results = await Promise.all(deletePromises);
    for (const res of results) {
      if (!res.ok) throw new Error('Failed to delete some files');
    }
  } catch (error) {
    console.error('Error deleting multiple files:', error);
    throw error;
  }
};
