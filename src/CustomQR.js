import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './CustomQR.css';

const CustomQR = ({ customLink, setCustomLink, onClose }) => {
  const qrRef = useRef();
  const [fileName, setFileName] = useState('');

  const downloadQR = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeName = (fileName || 'custom-link').replace(/[^\w\d_.-]/g, '_');
    link.href = pngUrl;
    link.download = `${safeName}-qr.png`;
    link.click();
  };

  return (
    <div className="qr-modal-overlay">
      <div className="qr-modal">
        <h3>Add a Link to Generate QR</h3>
        <input
          type="text"
          className="qr-input"
          placeholder="Enter any URL"
          value={customLink}
          onChange={(e) => setCustomLink(e.target.value)}
        />

        {customLink && (
          <div ref={qrRef} className="qr-preview">
            <QRCodeCanvas
              value={customLink}
              size={150}
              includeMargin
              bgColor="#ffffff"
              fgColor="#000000"
            />
            <input
              type="text"
              className="qr-input"
              placeholder="File name (optional)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <div className="qr-button-row">
              <button onClick={downloadQR}>Download</button>
              <button onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomQR;
