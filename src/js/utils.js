// utils.js
import axios from 'axios';

export const truncateFileName = (name, maxLength = 30) => {
  if (name.length <= maxLength) return name;
  const half = Math.floor((maxLength - 3) / 2);
  const start = name.slice(0, half);
  const end = name.slice(-half);
  return `${start}...${end}`;
};

export const getFolderChildren = async (folderId, accessToken) => {
  try {
    const res = await axios.get(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.data.files || [];
  } catch (error) {
    console.error('Error fetching folder children:', error);
    return [];
  }
};

