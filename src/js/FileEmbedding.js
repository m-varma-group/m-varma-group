import React, { useEffect } from 'react';
import '../css/FileEmbedding.css';

const extractPreviewUrl = (url) => {
  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  const folderMatch = url.match(/\/folders\/([^/?]+)/);
  const docMatch = url.match(/document\/d\/([^/]+)/);
  const spreadsheetMatch = url.match(/spreadsheets\/d\/([^/]+)/);
  const presentationMatch = url.match(/presentation\/d\/([^/]+)/);

  if (fileMatch) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  } else if (docMatch) {
    return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  } else if (spreadsheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetMatch[1]}/preview`;
  } else if (presentationMatch) {
    return `https://docs.google.com/presentation/d/${presentationMatch[1]}/preview`;
  } else if (folderMatch) {
    return null;
  }

  return url;
};

const FileEmbedding = ({ url }) => {
  useEffect(() => {
    const disableRightClick = (e) => e.preventDefault();
    const disableKeys = (e) => {
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u')) || 
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableKeys);

    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableKeys);
    };
  }, []);

  const embedUrl = extractPreviewUrl(url);

  if (!embedUrl) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2em', color: '#fff' }}>
        <p>🔗 <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>View folder</a></p>
      </div>
    );
  }

  return (
    <div className="file-embed-container">
      <iframe
        title="Embedded Google Drive File"
        src={embedUrl}
        allow="autoplay"
      />
      <div className="iframe-blocker" />
    </div>
  );
};

export default FileEmbedding;
