import React from 'react';
import QRgen from './QRgen';
import getFileIcon from './FileIcon';

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
}) => {
  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div className="drag-overlay">
          <div className="drag-message">
            <div className="drag-icon">📤</div>
            <div className="drag-text">Drop here to Upload</div>
          </div>
        </div>
      ) : (
        <>
          <p>Path: My Drive{folderStack.map(folder => ` / ${folder.name}`)}</p>

          {loading ? (
            <p>Loading files...</p>
          ) : error ? (
            <p>{error}</p>
          ) : sorted.length === 0 ? (
            <p>No files match your filters.</p>
          ) : (
            <div className="file-container">
              <ul className="file-list">
                {sorted.map(file => (
                  <li key={file.id}>
                    <div className="file-item">
                      <a
                        href={file.mimeType === 'application/vnd.google-apps.folder'
                          ? undefined
                          : `https://drive.google.com/file/d/${file.id}/view`}
                        target={file.mimeType === 'application/vnd.google-apps.folder' ? undefined : "_blank"}
                        rel="noreferrer"
                        onClick={() => {
                          if (file.mimeType === 'application/vnd.google-apps.folder') {
                            handleFolderClick(file);
                          }
                        }}
                        className="file-link"
                        title={file.name}
                      >
                        <span className="file-icon">{getFileIcon(file.mimeType)}</span>
                        <span className="file-name">{file.name}</span>
                      </a>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <QRgen
                          fileId={file.id}
                          fileName={file.name}
                          isFolder={file.mimeType === 'application/vnd.google-apps.folder'}
                        />
                        <button onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id, file.name);
                        }}>🗑️</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mobile back to top */}
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
