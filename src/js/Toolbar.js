import React, { useState } from 'react';
import QRInfoModal from './QRInfoModal';

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
  const [showQRModal, setShowQRModal] = useState(false);

  return (
    <div className="toolbar">
      <button onClick={handleCreateFolder} title="New Folder">
        <span className="icon" role="img" aria-label="Add Folder">➕</span>
        <span className="label">New Folder</span>
      </button>

      <button onClick={handleFileUploadClick} title="Upload File">
        <span className="icon" role="img" aria-label="Upload File">📤</span>
        <span className="label">Upload File</span>
      </button>

      <button onClick={() => setShowLinkModal(true)} title="Add Link">
        <span className="icon" role="img" aria-label="Custom QR Add Link">🔗</span>
        <span className="label">Add Link</span>
      </button>

      <button onClick={() => setShowQRModal(true)} title="Check QR">
        <span className="icon" role="img" aria-label="Check QR">⛶</span>
        <span className="label">Check QR Info</span>
      </button>

      {isMobile && (
        <button onClick={() => fetchDriveFiles(currentFolderId)} title="Refresh">
          <span className="icon" role="img" aria-label="Refresh">🔄</span>
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

      {showQRModal && <QRInfoModal onClose={() => setShowQRModal(false)} />}
    </div>
  );
};

export default Toolbar;
