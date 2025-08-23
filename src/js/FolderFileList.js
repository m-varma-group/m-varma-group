import React, { useEffect, useState } from 'react';
import getFileIcon from './FileIcon';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams } from 'react-router-dom';

const FolderFileList = ({ shortId: propShortId, label: propLabel, source: propSource }) => {
  const { id: routeId } = useParams();
  const shortId = propShortId || routeId;

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState(propLabel);
  const [source, setSource] = useState(propSource);
  const [dataType, setDataType] = useState(null); // 'drive' or 'enscape'
  const [showOverlayLogo, setShowOverlayLogo] = useState(true); // NEW: overlay control

  // Dynamically load CSS
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

  useEffect(() => {
    if (source) loadStylesheet(source);
  }, [source]);

  useEffect(() => {
    const fetchFolderData = async () => {
      try {
        const collections = ['qrCodes', 'qr360'];
        let docSnap = null;
        for (const collection of collections) {
          const docRef = doc(db, collection, shortId);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            docSnap = snapshot;
            setSource(collection);
            break;
          }
        }

        if (!docSnap) {
          setError('QR not found.');
          setLoading(false);
          return;
        }

        const data = docSnap.data();

        // Set overlay based on Firestore if qr360
        if (source === 'qr360' && data.showOverlayLogo !== undefined) {
          setShowOverlayLogo(data.showOverlayLogo);
        }

        // Handle folder contents
        if (data.folderContents) {
          setFiles(data.folderContents);
          setDataType('drive');
        } else if (data.folderUrls) {
          const convertedFiles = data.folderUrls.map((item, index) => ({
            id: `enscape-${index}`,
            name: item.fileName,
            url: item.url,
            type: 'enscape-360',
          }));
          setFiles(convertedFiles);
          setDataType('enscape');
        } else if (data.targetUrl) {
          setFiles([{
            id: 'single-file',
            name: data.fileName || 'File',
            url: data.targetUrl,
            type: 'enscape-360',
          }]);
          setDataType('enscape');
        } else {
          setError('No folder contents found.');
        }

        // Set label
        if (data.label) setLabel(data.label);
        else if (data.fileName) setLabel(data.fileName);

      } catch (err) {
        console.error('Failed to fetch folder metadata:', err);
        setError('Failed to load folder contents.');
      } finally {
        setLoading(false);
      }
    };

    fetchFolderData();
  }, [shortId, source]);

  const getPreviewUrl = (file) => {
    if (dataType === 'drive') {
      const { id, type } = file;
      if (type === 'application/vnd.google-apps.document') return `https://docs.google.com/document/d/${id}/preview`;
      if (type === 'application/vnd.google-apps.spreadsheet') return `https://docs.google.com/spreadsheets/d/${id}/preview`;
      if (type === 'application/vnd.google-apps.presentation') return `https://docs.google.com/presentation/d/${id}/preview`;
      return `https://drive.google.com/file/d/${id}/preview`;
    }
    else if (dataType === 'enscape') return file.url;
    return file.url;
  };

  const handleFileClick = (file) => setSelectedFile(file);

  const getFileIconForEnscape = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg': case 'jpeg': case 'png': case 'gif': return '🖼️';
      case 'mp4': case 'avi': case 'mov': return '🎥';
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'ppt': case 'pptx': return '📈';
      default: return '🔗';
    }
  };

  if (selectedFile) {
    const previewUrl = getPreviewUrl(selectedFile);
    return (
      <div className="file-embed-container">
        <iframe 
          src={previewUrl} 
          title="Preview" 
          allowFullScreen 
          allow="gyroscope; accelerometer; fullscreen; autoplay"
        />
        <div className="iframe-blocker" />

        {/* Overlay logo only if showOverlayLogo is true */}
        {showOverlayLogo && (
          <>
            <img src="/overlay_logo.png" alt="Centered Logo" className="center-image" />
            <div className="top-right-blocker" />
            <div className="bottom-blocker" />
            <div className="side-blocker left-blocker" />
            <div className="side-blocker right-blocker" />
          </>
        )}

        <button
          className="primary-button"
          onClick={() => setSelectedFile(null)}
          style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 1001 }}
        >
          ←
        </button>
      </div>
    );
  }

  return (
    <main>
      <h1>{label || 'Folder Contents'}</h1>
      {loading && <p>Loading files...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {files.length === 0 && !loading && !error && <p>No files found in this folder.</p>}

      <ul>
        {files.map((file) => (
          <li key={file.id} onClick={() => handleFileClick(file)}>
            <div className="file-item">
              {/* eslint-disable-next-line */}
              <a 
                className="file-link" 
                href="#" 
                onClick={(e) => e.preventDefault()}
                style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
              >
                <span className="file-icon">
                  {dataType === 'drive' ? getFileIcon(file.type) : getFileIconForEnscape(file.name)}
                </span>
                <span className="file-name">{file.name}</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default FolderFileList;
