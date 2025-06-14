import React, { useState } from 'react';
import '../css/UploadModal.css';

const UploadProgressModal = ({ uploadProgress, onCancel, onClose }) => {
  const [minimized, setMinimized] = useState(false);

  const uploads = Object.entries(uploadProgress).map(([name, progress]) => ({
    name,
    progress,
  }));

  const allCompleted = uploads.length > 0 && uploads.every(file => file.progress === 100);

  return (
    <div className={`upload-modal ${minimized ? 'minimized' : ''}`}>
      <div className="upload-modal-header">
        <h4>File Uploads</h4>
            <button className="minimize-button" onClick={() => setMinimized(!minimized)}>
             {minimized ? 'Expand' : 'Minimize'}
            </button>

      </div>

      {!minimized && (
        <>
          {uploads.map((file) => (
            <div key={file.name} className="upload-item">
              <span>{file.name}</span>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{ width: `${file.progress}%` }}
                />
              </div>

              {file.progress < 100 ? (
                <div className="upload-actions">
                  <span>{file.progress}%</span>
                  {/* <button onClick={() => onCancel(file.name)}>Cancel</button> */}
                </div>
              ) : (
                <div className="upload-actions">
                  <span style={{ color: 'green' }}>Completed</span>
                </div>
              )}
            </div>
          ))}

          {allCompleted && (
            <div className="close-button">
              <button className="close-button" onClick={onClose}>Close</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UploadProgressModal;
