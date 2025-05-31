import React from 'react';
import QRgen from './QRgen'; // Component to generate QR codes for file/folder links
import getFileIcon from './FileIcon'; // Function to return icon based on file mime type

// Main component to render the Drive file/folder UI and handle drag/drop
const DriveDropZone = ({
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  folderStack,
  loading,
  error,
  sorted,
  handleFolderClick,
  currentFolderId,
  fetchDriveFiles,
  handleDelete,
  isMobile,
  scrollToTop,
  setShowPermissions,
  setSelectedFileId,
  setSelectedFileName
}) => {



  // Copies the Google Drive shareable link to the clipboard
  const handleCopyLink = (fileId, isFolder) => {
    const url = isFolder
      ? `https://drive.google.com/drive/folders/${fileId}`
      : `https://drive.google.com/file/d/${fileId}/view`;
    navigator.clipboard.writeText(url)
      .then(() => alert('Link copied to clipboard!'))
      .catch(() => alert('Failed to copy link.'));
  };

  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* If dragging, show the drop overlay */}
      {isDragging ? (
        <div className="drag-overlay">
          <div className="drag-message">
            <div className="drag-icon">
              <span role="img" aria-label="Drop here to Upload">📤</span>
            </div>
            <div className="drag-text">Drop here to Upload</div>
          </div>
        </div>
      ) : (
        <>
          {/* Breadcrumb navigation display */}
          <p>Path: My Drive{folderStack.map(folder => ` / ${folder.name}`)}</p>

          {/* Loading, error or empty state handling */}
          {loading ? (
            <p>Loading files...</p>
          ) : error ? (
            <p>{error}</p>
          ) : sorted.length === 0 ? (
            <p>No files match your filters.</p>
          ) : (
            <div className="file-container">
              <ul className="file-list">
                {/* Loop through all sorted files/folders */}
                {sorted.map(file => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                  return (
                    <li key={file.id}>
                      <div className="file-item">
                        {/* Clickable file/folder name (intercept folder navigation) */}
                        <a
                          href={isFolder
                            ? `https://drive.google.com/drive/folders/${file.id}`
                            : `https://drive.google.com/file/d/${file.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            if (isFolder) {
                              e.preventDefault();
                              handleFolderClick(file);
                            }
                          }}
                          className="file-link"
                          title={file.name}
                        >
                          <span className="file-icon">{getFileIcon(file.mimeType)}</span>
                          <span className="file-name">{file.name}</span>
                        </a>

                        {/* Action buttons for each file/folder */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <QRgen
                            fileId={file.id}
                            fileName={file.name}
                            isFolder={isFolder}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(file.id, isFolder);
                            }}
                            title="Copy shareable link"
                          >
                            <span role="img" aria-label="Add Link">📋</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFileId(file.id);
                              setSelectedFileName(file.name);
                              setShowPermissions(true);
                            }}
                            title="Manage permissions"
                          >
                            <span role="img" aria-label="Permission Settings">⚙️</span>
                          </button>


                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.id, file.name);
                            }}
                            title="Delete"
                          >
                            <span role="img" aria-label="delete">🗑️</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Mobile and desktop specific scroll-to-top behavior */}
          {isMobile && folderStack.length === 0 && (
            <div className="bottom-nav">
              <button onClick={scrollToTop}>↑</button>
            </div>
          )}
          {!isMobile && (
            <button className="scroll-to-top" onClick={scrollToTop} title="top">Back To Top</button>
          )}
        </>
      )}
      
    </div>
    
  );
};

export default DriveDropZone;
