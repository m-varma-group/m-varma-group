import React from 'react';

const Toolbar = ({
  isMobile,
  handleCreateFolder,
  handleFileUploadClick,
  setShowLinkModal,
  fetchDriveFiles,
  currentFolderId,
  fileInputRef,
  handleFileUpload,
}) => {
  return (
    <div className="toolbar">
      <button onClick={handleCreateFolder} title="New Folder">
        <span className="icon">➕</span>
        <span className="label">New Folder</span>
      </button>

      <button onClick={handleFileUploadClick} title="Upload File">
        <span className="icon">📤</span>
        <span className="label">Upload File</span>
      </button>

      <button onClick={() => setShowLinkModal(true)} title="Add Link">
        <span className="icon">🔗</span>
        <span className="label">Add Link</span>
      </button>

      {isMobile && (
        <button onClick={() => fetchDriveFiles(currentFolderId)} title="Refresh">
          <span className="icon">🔄</span>
          <span className="label">Refresh</span>
        </button>
      )}

      <input
        type="file"
        multiple
        onChange={handleFileUpload}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default Toolbar;
