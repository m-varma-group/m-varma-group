// Toolbar.js
import React, { useState } from 'react';
import QRInfoModal from './QRInfoModal';
import EnscapeModal from './EnscapeModal';
import EditQRModal from './EditQRModal';

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
  const [showEnscapeModal, setShowEnscapeModal] = useState(false);
  const [showEditQRModal, setShowEditQRModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

      <button onClick={() => setShowEnscapeModal(true)} title="Enscape 360 Manager">
        <span className="icon" role="img" aria-label="Enscape 360 Manager">
          <img
            src="Enscape-logo.png"
            alt="Enscape Logo"
            style={{ display: 'inline-block', verticalAlign: 'middle', height: '1.2em' }}
          />
        </span>
        <span className="label">Enscape 360</span>
      </button>

      {/* Dropdown */}
      <div className="dropdown">
        <button onClick={() => setDropdownOpen(!dropdownOpen)} title="QR Tools">
          <span className="icon" role="img" aria-label="QR Tools">🧰</span>
          <span className="label">QR Tools ▸</span>
        </button>

        {dropdownOpen && (
          <div className="dropdown-menu">
            <button onClick={() => { setShowQRModal(true); setDropdownOpen(false); }}>
              ⛶ Check QR Info
            </button>
            <button onClick={() => { setShowEditQRModal(true); setDropdownOpen(false); }}>
              ✎ Update QR
            </button>
            <button onClick={() => { setShowLinkModal(true); setDropdownOpen(false); }}>
              ➤ Normal QR
            </button>
          </div>
        )}
      </div>



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
      {showEnscapeModal && <EnscapeModal onClose={() => setShowEnscapeModal(false)} />}
      {showEditQRModal && <EditQRModal onClose={() => setShowEditQRModal(false)} />}
    </div>
  );
};

export default Toolbar;
