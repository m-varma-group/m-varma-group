/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/jsx-no-comment-textnodes */
import React, { useEffect, useState } from 'react';
import getFileIcon from './FileIcon';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams } from 'react-router-dom';
import '../css/FolderFileList.css';

const FolderFileList = ({ shortId: propShortId, label: propLabel, source: propSource }) => {
  const { id: routeId } = useParams();
  const shortId = propShortId || routeId;

  const [currentFolderContents, setCurrentFolderContents] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState(propLabel);
  const [source, setSource] = useState(propSource);
  const [dataType, setDataType] = useState(null); // 'drive' or 'enscape'
  const [showOverlayLogo, setShowOverlayLogo] = useState(true);
  
  // Navigation state for nested folders
  const [folderHistory, setFolderHistory] = useState([]);
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [allFolderData, setAllFolderData] = useState(null); // Store complete nested structure

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

  // Find folder by ID in nested structure
  const findFolderById = (items, targetId) => {
    for (const item of items) {
      if (item.id === targetId) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findFolderById(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Navigate to a specific folder
  const navigateToFolder = (folder) => {
    if (!folder.children || folder.children.length === 0) {
      // Empty folder, just show empty state
      setCurrentFolderContents([]);
    } else {
      setCurrentFolderContents(folder.children);
    }
    
    // Update navigation history and path
    setFolderHistory(prev => [...prev, {
      id: folder.id,
      name: folder.name,
      path: currentFolderPath
    }]);
    
    setCurrentFolderPath(currentFolderPath ? `${currentFolderPath}/${folder.name}` : folder.name);
  };

  // Navigate back to previous folder
  const navigateBack = () => {
    if (folderHistory.length === 0) return;
    
    const previousFolder = folderHistory[folderHistory.length - 1];
    setFolderHistory(prev => prev.slice(0, -1));
    
    if (folderHistory.length === 1) {
      // Going back to root
      setCurrentFolderContents(allFolderData);
      setCurrentFolderPath('');
    } else {
      // Going back to parent folder
      const parentHistory = folderHistory.slice(0, -1);
      const parentFolderId = parentHistory[parentHistory.length - 1].id;
      const parentFolder = findFolderById(allFolderData, parentFolderId);
      
      if (parentFolder) {
        setCurrentFolderContents(parentFolder.children || []);
        setCurrentFolderPath(previousFolder.path);
      }
    }
  };

  // Navigate to root folder
  const navigateToRoot = () => {
    setCurrentFolderContents(allFolderData);
    setFolderHistory([]);
    setCurrentFolderPath('');
  };

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

        // Set overlay based on source and Firestore data
        if (source === 'qr360') {
          // For qr360, use Firestore setting or default to true
          setShowOverlayLogo(data.showOverlayLogo !== undefined ? data.showOverlayLogo : true);
        } else {
          // For qrCodes, never show overlay
          setShowOverlayLogo(false);
        }

        // Handle folder contents
        if (data.folderContents) {
          setAllFolderData(data.folderContents);
          setCurrentFolderContents(data.folderContents); // Start at root level
          setDataType('drive');
        } else if (data.folderUrls) {
          const convertedFiles = data.folderUrls.map((item, index) => ({
            id: `enscape-${index}`,
            name: item.fileName,
            url: item.url,
            type: 'enscape-360',
          }));
          setAllFolderData(convertedFiles);
          setCurrentFolderContents(convertedFiles);
          setDataType('enscape');
        } else if (data.targetUrl) {
          const singleFile = [{
            id: 'single-file',
            name: data.fileName || 'File',
            url: data.targetUrl,
            type: 'enscape-360',
          }];
          setAllFolderData(singleFile);
          setCurrentFolderContents(singleFile);
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

  const handleFileClick = (file) => {
    const isFolder = file.type === 'application/vnd.google-apps.folder';
    
    if (isFolder) {
      // Navigate into the folder
      navigateToFolder(file);
    } else {
      // Open file preview
      setSelectedFile(file);
    }
  };

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

        {/* Overlay logo only for qr360 source and if showOverlayLogo is true */}
        {source === 'qr360' && showOverlayLogo && (
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
      {/* Header with navigation */}
      <div className="folder-navigation">
        <h1>{label || 'Folder Contents'}</h1>
        
        {/* Breadcrumb navigation */}
        {currentFolderPath && (
          <div className="breadcrumb-nav">
            <button
              onClick={navigateToRoot}
              className="breadcrumb-button"
            >
              📁 {label || 'Root'}
            </button>
            <span>/</span>
            {folderHistory.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <span>{folder.name}</span>
                {index < folderHistory.length - 1 && <span>/</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Back button */}
        {folderHistory.length > 0 && (
          <button
            onClick={navigateBack}
            className="back-button"
          >
            ← Back
          </button>
        )}
      </div>

      {loading && <p className="loading-message">Loading files...</p>}
      {error && <div className="error-message">{error}</div>}
      {currentFolderContents.length === 0 && !loading && !error && (
        <div className="empty-message">No files found in this folder.</div>
      )}

      <ul className="file-list">
        {currentFolderContents.map((file) => {
          const isFolder = file.type === 'application/vnd.google-apps.folder';
          const hasChildren = file.children && file.children.length > 0;
          
          return (
            <li key={file.id} className="file-list-item">
              <div className="file-item">
                <a 
                  className={`file-link ${isFolder ? 'folder-link' : ''}`}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleFileClick(file);
                  }}
                >
                  <div className="file-icon">
                    {dataType === 'drive' ? getFileIcon(file.type) : getFileIconForEnscape(file.name)}
                  </div>
                  <div className="file-name-container">
                    <div className="file-name">
                      {file.name}
                    </div>
                    <div className="file-meta">
                      {isFolder && hasChildren && (
                        <span>{file.children.length} items</span>
                      )}
                      {isFolder && !hasChildren && (
                        <span>Empty folder</span>
                      )}
                      {file.error && (
                        <span className="file-error">⚠️ {file.error}</span>
                      )}
                    </div>
                  </div>
                  {isFolder && (
                    <div className="folder-arrow"></div>
                  )}
                </a>
              </div>
            </li>
          );
        })}
      </ul>

    </main>
  );
};

export default FolderFileList;