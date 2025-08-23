import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  const [showOverlayLogo, setShowOverlayLogo] = useState(true);

  useEffect(() => {
    loadStylesheet(source);

    const disableRightClick = (e) => e.preventDefault();
    const disableKeys = (e) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'u')) || e.key === 'F12') {
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

  // Extract QR ID automatically from the URL
  const getQRIdFromPath = () => {
    if (source !== 'qr360') return null;
    const path = window.location.pathname; // e.g., /qr/abc123
    const match = path.match(/\/qr\/([^/]+)/);
    return match ? match[1] : null;
  };

  const qrId = getQRIdFromPath();

  // Fetch QR metadata if source is qr360
  useEffect(() => {
    const fetchQRData = async () => {
      if (source === 'qr360' && qrId) {
        try {
          const docRef = doc(db, 'qr360', qrId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setShowOverlayLogo(data.showOverlayLogo ?? true); // default true
          }
        } catch (err) {
          console.error('Error fetching QR metadata:', err);
        }
      }
    };
    fetchQRData();
  }, [source, qrId]);

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
        allow="gyroscope; accelerometer; fullscreen; autoplay"
      />
      <div className="iframe-blocker" />

      {source === 'qr360' && showOverlayLogo && (
        <>
          <img src="/overlay_logo.png" alt="Centered Logo" className="center-image" />
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
