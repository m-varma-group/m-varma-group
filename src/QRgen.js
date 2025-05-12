import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { truncateFileName } from './utils.js';
import './QRgen.css';

const QRgen = ({ fileId, isFolder, fileName }) => {
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef(null);
  const qrInstance = useRef(null);

  const url = isFolder
    ? `https://drive.google.com/drive/folders/${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`;

  const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

  useEffect(() => {
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width: 200,
        height: 200,
        data: url,
        image: '/logo192.png',
        dotsOptions: {
          color: '#000',
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 0,
          imageSize: 0.5,
        },
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
      });
    } else {
      qrInstance.current.update({
        data: url,
      });
    }

    if (qrRef.current && showQR) {
      qrInstance.current.append(qrRef.current);
    }
  }, [url, showQR]);

  const downloadQR = () => {
    qrInstance.current.download({
      name: `${safeName}-qr`,
      extension: 'png',
    });
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
            <div ref={qrRef}></div>
            <button onClick={downloadQR}>Download QR</button>
            <button onClick={() => setShowQR(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default QRgen;
