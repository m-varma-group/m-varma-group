import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { truncateFileName } from './utils.js';
import '../css/QRgen.css';

const QRgen = ({ fileId, isFolder, fileName }) => {
  const [showInputModal, setShowInputModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [message, setMessage] = useState('');
  const [expiration, setExpiration] = useState('');
  const qrRef = useRef(null);
  const qrInstance = useRef(null);

  const baseUrl = isFolder
    ? `https://drive.google.com/drive/folders/${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`;

  const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

  useEffect(() => {
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width: 200,
        height: 200,
        data: baseUrl,
        image: '/logo.png',
        dotsOptions: { color: '#000', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 0,
          imageSize: 0.6,
        },
        qrOptions: { errorCorrectionLevel: 'H' },
      });
    } else {
      qrInstance.current.update({
        data: baseUrl,
      });
    }

    if (qrRef.current && showQR) {
      qrRef.current.innerHTML = '';
      qrInstance.current.append(qrRef.current);
    }
  }, [baseUrl, showQR]);

  const downloadQR = () => {
    qrInstance.current.download({
      name: `${safeName}-qr`,
      extension: 'png',
    });
  };

  const handleGenerateClick = () => {
    setShowInputModal(true);
  };

  const handleConfirmInputs = () => {
    if (!expiration) {
      alert('Please enter an expiration date and time.');
      return;
    }

    // Placeholder: You will send this info to backend in the next step
    console.log('Message:', message);
    console.log('Expiration:', expiration);

    setShowInputModal(false);
    setShowQR(true);
  };

  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); handleGenerateClick(); }}>
        Generate QR
      </button>

      {/* Input Modal */}
      {showInputModal && (
        <div className="qr-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal-gen">
            <h3>QR Options for "{truncateFileName(fileName)}"</h3>

            <label>
              Optional Message:
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Enter message to associate with this QR (optional)"
              />
            </label>

            <label>
              Expiration Time:
              <input
                type="datetime-local"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                required
              />
            </label>

            <button onClick={handleConfirmInputs}>Generate QR</button>
            <button onClick={() => setShowInputModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="qr-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal-gen">
            <h3>QR for "{truncateFileName(fileName)}"</h3>

            <div className="qr-preview-container" ref={qrRef}></div>


            <button onClick={downloadQR}>Download QR</button>
            <button onClick={() => setShowQR(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default QRgen;
