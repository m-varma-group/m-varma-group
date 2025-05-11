// QRgen.js
import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { truncateFileName } from './utils.js';
import './QRgen.css';

const QRgen = ({ fileId, isFolder, fileName }) => {
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef(null);
  const url = isFolder
    ? `https://drive.google.com/drive/folders/${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`;

  const downloadQR = () => {
    const canvas = qrRef.current.querySelector('canvas');
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

    link.href = pngUrl;
    link.download = `${safeName}-qr.png`;
    link.click();
  };

  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); setShowQR(true); }}>
        Generate QR
      </button>

      {showQR && (
        <div className="qr-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal">
            <h3>QR for "{truncateFileName(fileName)}"</h3>
            <div ref={qrRef}>
              <QRCodeCanvas value={url} size={160} includeMargin />
            </div>
            <button onClick={downloadQR}>Download QR</button>
            <button onClick={() => setShowQR(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default QRgen;
