import axios from 'axios';

export const fetchDriveFiles = async (folderId, token) => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,parents,size,modifiedTime,createdTime)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await res.json();
  return data.files || [];
};

export const fetchUserInfo = async (token) => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
};

export const createFolder = async (name, parentId, token) => {
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
};

export const uploadFiles = async (
  fileList,
  existingFiles,
  folderId,
  token,
  onProgress,
  abortSignal
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

  const uploadSingleFile = (file) => {
    return new Promise((resolve, reject) => {
      const uniqueName = getUniqueName(file.name);
      const metadata = {
        name: uniqueName,
        parents: [folderId],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const source = axios.CancelToken.source();

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          source.cancel(`Upload cancelled for ${file.name}`);
        });
      }

      axios
        .post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', form, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(file.name, percent);
            }
          },
          cancelToken: source.token,
        })
        .then(resolve)
        .catch((error) => {
          if (axios.isCancel(error)) {
            console.log(error.message);
            reject(new DOMException(error.message, 'AbortError'));
          } else {
            reject(error);
          }
        });
    });
  };

  // Sequential uploads to support AbortController cleanly
  for (const file of fileList) {
    await uploadSingleFile(file);
  }
};

export const deleteFile = async (fileId, token) => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete file');
};

export const deleteMultipleFiles = async (fileIds, token) => {
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
};
