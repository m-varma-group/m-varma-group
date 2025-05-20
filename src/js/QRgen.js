import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { truncateFileName } from './utils.js';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import '../css/QRgen.css';

const QRgen = ({ fileId, isFolder, fileName }) => {
  const [showInputModal, setShowInputModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [message, setMessage] = useState('');
  const [expiration, setExpiration] = useState('');
  const qrRef = useRef(null);
  const qrInstance = useRef(null);

  // Google Drive shareable link
  const baseUrl = isFolder
    ? `https://drive.google.com/drive/folders/${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`;

  const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

  // Initialize QR code once
  useEffect(() => {
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width: 200,
        height: 200,
        data: '', // Will set after metadata is saved
        image: '/logo.png',
        dotsOptions: { color: '#000', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 0,
          imageSize: 0.4,
        },
        qrOptions: { errorCorrectionLevel: 'H' },
      });
    }
  }, []);

  // Append QR to DOM when shown
  useEffect(() => {
    if (qrRef.current && qrInstance.current && showQR) {
      qrRef.current.innerHTML = '';
      qrInstance.current.append(qrRef.current);
    }
  }, [showQR]);

  const downloadQR = () => {
    qrInstance.current.download({
      name: `${safeName}-qr`,
      extension: 'png',
    });
  };

  const handleGenerateClick = () => {
    setShowInputModal(true);
  };

  const handleConfirmInputs = async () => {
    if (!expiration) {
      alert('Please enter an expiration date and time.');
      return;
    }

    const shortId = nanoid(8); // Unique QR ID

    const qrMetadata = {
      message,
      expiration: new Date(expiration),
      targetUrl: baseUrl,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'qrCodes', shortId), qrMetadata);
      console.log('QR metadata saved with ID:', shortId);

      // This is the URL users will be redirected to when they scan the QR
      const landingPageUrl = `${window.location.origin}/qr/${shortId}`;
      qrInstance.current.update({ data: landingPageUrl });

      setShowInputModal(false);
      setShowQR(true);
    } catch (err) {
      console.error('Error saving QR metadata:', err);
      alert('Failed to generate QR. Please try again.');
    }
  };

  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); handleGenerateClick(); }}>
        Generate QR
      </button>

      {/* Input Modal */}
      {showInputModal && (
        <div className="qr-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal">
            <h3>QR Options for "{truncateFileName(fileName)}"</h3>

            <textarea
              className="qr-input-url"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Enter message to associate with this QR (optional)"
            />

            <input
              className="qr-input-expiry"
              type="datetime-local"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              required
            />

            <div className="qr-button-row">
              <button onClick={handleConfirmInputs}>Generate</button>
              <button onClick={() => setShowInputModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {showQR && (
        <div className="qr-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal">
            <h3>QR for "{truncateFileName(fileName)}"</h3>

            <div className="qr-preview" ref={qrRef}></div>

            <div className="qr-button-row">
              <button onClick={downloadQR}>Download</button>
              <button onClick={() => setShowQR(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRgen;
