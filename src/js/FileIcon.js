// FileIcon.js
const getFileIcon = (mimeType) => {
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎧';
  if (mimeType === 'application/msword') return '📝';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '📝';
  if (mimeType === 'application/vnd.ms-excel') return '📊';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '📊';
  if (mimeType === 'application/vnd.ms-powerpoint') return '📽️';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return '📽️';
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') return '🗜️';
  if (mimeType === 'text/plain') return '📄';
  if (mimeType.includes('cad')) return '📐';
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  return '📄';
};

export default getFileIcon;
