import React, { useEffect } from 'react';

// Dynamically import the correct CSS file based on source
const loadStylesheet = (source) => {
  switch (source) {
    case 'qr360':
      require('../css/360Embedding.css');
      break;
    case 'qrCodes':
    default:
      require('../css/DriveEmbedding.css');
      break;
  }
};

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

const FileEmbedding = ({ url, source }) => {
  useEffect(() => {
    loadStylesheet(source);

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
  }, [source]);

  const embedUrl = extractPreviewUrl(url);

  if (!embedUrl) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2em', color: '#fff' }}>
        <p>
          🔗{' '}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4fc3f7' }}
          >
            View folder
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="file-embed-container">
      <iframe
        title="Embedded File Preview"
        src={embedUrl}
        allow="autoplay"
      />
      <div className="iframe-blocker" />

      {source === 'qr360' && (
        <>
          <img
            src="/overlay_logo.png"
            alt="Centered Logo"
            className="center-image"
          />
          <div className="top-right-blocker" />
          <div className="bottom-blocker" />
          <div className="side-blocker left-blocker" />
          <div className="side-blocker right-blocker" />
        </>
      )}
    </div>
  );
};

export default FileEmbedding;
