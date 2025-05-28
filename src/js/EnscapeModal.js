import React, { useState } from 'react';
import '../css/EnscapeModal.css';

const EnscapeModal = ({ onClose }) => {
  const [fadeClass, setFadeClass] = useState('fade-in');

  const handleClose = () => {
    setFadeClass('fade-out');
    setTimeout(() => onClose(), 200); // Wait for animation to finish
  };

  return (
    <div className={`enscape-modal-overlay ${fadeClass}`} onClick={handleClose}>
      <div className="enscape-modal" onClick={(e) => e.stopPropagation()}>
        <div className="enscape-modal-header">
          <h2>Enscape 360 Manager</h2>
          <button className="enscape-close-button" onClick={handleClose}>Close</button>
        </div>
        <div className="enscape-modal-content">
          <p>This is where you can manage your Enscape 360 content.</p>
        </div>
      </div>
    </div>
  );
};

export default EnscapeModal;
