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

  // Dynamically load the correct CSS file based on source
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
    if (source) {
      loadStylesheet(source);
    }
  }, [source]);

  useEffect(() => {
    const fetchFolderData = async () => {
      try {
        const collections = ['qrCodes', 'qr360'];
        let docSnap = null;
        let foundCollection = null;
        
        for (const collection of collections) {
          const docRef = doc(db, collection, shortId);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            docSnap = snapshot;
            /* eslint-disable-next-line */
            foundCollection = collection;
            setSource(collection);
            break;
          }
        }

        if (docSnap) {
          const data = docSnap.data();
          
          // Handle Google Drive folders (from qrCodes collection)
          if (data.folderContents) {
            setFiles(data.folderContents);
            setDataType('drive');
          } 
          // Handle Enscape 360 folders (from qr360 collection)
          else if (data.folderUrls) {
            // Convert folderUrls to a format suitable for display
            const convertedFiles = data.folderUrls.map((item, index) => ({
              id: `enscape-${index}`, // Create unique ID
              name: item.fileName,
              url: item.url,
              type: 'enscape-360', // Custom type for Enscape files
            }));
            setFiles(convertedFiles);
            setDataType('enscape');
          } 
          // Handle single file (fallback)
          else if (data.targetUrl) {
            const singleFile = [{
              id: 'single-file',
              name: data.fileName || 'File',
              url: data.targetUrl,
              type: 'enscape-360',
            }];
            setFiles(singleFile);
            setDataType('enscape');
          }
          else {
            setError('No folder contents found.');
          }
          
          // Set label from various possible sources
          if (data.label) {
            setLabel(data.label);
          } else if (data.fileName) {
            setLabel(data.fileName);
          }
        } else {
          setError('QR not found.');
        }
      } catch (err) {
        console.error('Failed to fetch folder metadata:', err);
        setError('Failed to load folder contents.');
      } finally {
        setLoading(false);
      }
    };

    fetchFolderData();
  }, [shortId]);

  const getPreviewUrl = (file) => {
    // Handle Google Drive files
    if (dataType === 'drive') {
      const { id, type } = file;
      if (type === 'application/vnd.google-apps.document') {
        return `https://docs.google.com/document/d/${id}/preview`;
      } else if (type === 'application/vnd.google-apps.spreadsheet') {
        return `https://docs.google.com/spreadsheets/d/${id}/preview`;
      } else if (type === 'application/vnd.google-apps.presentation') {
        return `https://docs.google.com/presentation/d/${id}/preview`;
      } else {
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    }
    // Handle Enscape 360 files - return the direct URL
    else if (dataType === 'enscape') {
      return file.url;
    }
    
    return file.url; // Fallback
  };

  const handleFileClick = (file) => {
    // For both Google Drive and Enscape files, show preview in iframe
    setSelectedFile(file);
  };

  const getFileIconForEnscape = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📈';
      default:
        return '🔗'; // Default link icon for 360 tours
    }
  };

  // Preview mode for both Google Drive and Enscape files
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
        
        {/* Add the same overlay elements for Enscape files as in FileEmbedding */}
        {dataType === 'enscape' && (
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
        
        <button
          className="primary-button"
          onClick={() => setSelectedFile(null)}
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            zIndex: 1001,
          }}
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

      {files.length === 0 && !loading && !error && (
        <p>No files found in this folder.</p>
      )}

      <ul>
        {files.map((file) => (
          <li key={file.id} onClick={() => handleFileClick(file)}>
            <div className="file-item">
              {/* eslint-disable-next-line */}
              <a 
                className="file-link" 
                href="#" 
                onClick={(e) => e.preventDefault()}
                style={{ 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <span className="file-icon">
                  {dataType === 'drive' ? getFileIcon(file.type) : getFileIconForEnscape(file.name)}
                </span>
                <span className="file-name">{file.name}</span>
                {dataType === 'enscape' && (
                  <span className="file-type-indicator" style={{ 
                    marginLeft: '8px', 
                    fontSize: '0.8em', 
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                  </span>
                )}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default FolderFileList;