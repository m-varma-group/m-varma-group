import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchDriveFiles } from './DriveAPI';
import '../css/QRInfoModal.css';

const QRInfoModal = ({ onClose }) => {
  const [qrData, setQrData] = useState(null);
  // eslint-disable-next-line
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [qrId, setQrId] = useState(null);

  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleClose = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  const clearState = () => {
    setQrData(null);
    setFileInfo(null);
    setError('');
    setQrImage(null);
    setQrId(null);
    setShowPassword(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClose]);

  const extractFileId = (url) => {
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    const folderMatch = url.match(/\/folders\/([^/?]+)/);
    return fileMatch?.[1] || folderMatch?.[1] || null;
  };

  const fetchQRDetails = async (qrIdFromUrl) => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'qrCodes', qrIdFromUrl));
      if (!snap.exists()) {
        setError('QR code not found or expired.');
        setLoading(false);
        return;
      }

      const data = snap.data();
      const expirationDate =
        data.expiration?.toDate?.() || data.expiration || null;

      if (expirationDate && new Date() > expirationDate) {
        setError('QR code is expired.');
        setLoading(false);
        return;
      }

      setQrData({ ...data, expiration: expirationDate });
      setQrId(qrIdFromUrl);

      const fileId = extractFileId(data.targetUrl);
      if (!fileId) {
        setFileInfo({ name: '-', type: '-', owner: '-', modifiedTime: '-' });
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('access_token');
      const files = await fetchDriveFiles('', token);
      const file = files.find(f => f.id === fileId);

      if (file) {
        setFileInfo({
          name: file.name || '-',
          type: file.mimeType.includes('folder') ? 'Folder' :
                file.mimeType.includes('pdf') ? 'PDF' :
                file.mimeType.includes('image') ? 'Image' :
                'File',
          owner: file.owners?.[0]?.displayName || 'Unknown',
          modifiedTime: file.modifiedTime
            ? new Date(file.modifiedTime).toLocaleString()
            : 'N/A',
        });
      } else {
        setFileInfo({ name: '(Not found)', type: '-', owner: '-', modifiedTime: '-' });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load QR details.');
    }
    setLoading(false);
  };

  const scanImage = async (file) => {
    const qrCode = new Html5Qrcode('qr-temp-canvas');
    try {
      const result = await qrCode.scanFile(file, true);
      const idMatch = result.match(/\/qr\/([^/]+)/);
      const id = idMatch ? idMatch[1] : null;

      if (!id) {
        setError('QR code format is invalid. Expected /qr/:id');
        return;
      }

      await fetchQRDetails(id);
    } catch (err) {
      console.error('QR scan failed:', err);
      setError("QR code not detected in image.");
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    clearState();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Please drop a valid image file.');
      return;
    }
    setQrImage(URL.createObjectURL(file));
    await scanImage(file);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    clearState();
    setQrImage(URL.createObjectURL(file));
    await scanImage(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const formatDateDDMMYYYY = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="qr-info-modal-backdrop">
      <div className={`qr-info-modal custom-qr-modal ${fadeOut ? 'fade-out' : ''}`} ref={modalRef}>
        <button className="close-btn" onClick={handleClose}>×</button>
        <h2>Scan QR Code from Image</h2>

        {!qrImage && (
          <div className="qr-dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
            <p>Drag and drop a QR code image here</p>
          </div>
        )}

        {qrImage && (
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <img
              src={qrImage}
              alt="QR Preview"
              style={{ maxWidth: '180px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            />
          </div>
        )}

        <div className="upload-btn-group">
          <button className="upload-btn" onClick={() => fileInputRef.current.click()}>
            Upload QR Image
          </button>
          <button className="upload-btn" onClick={clearState} style={{ backgroundColor: '#dc3545' }}>
            Clear
          </button>
          <button className="upload-btn" onClick={handleClose} style={{ backgroundColor: '#6c757d' }}>
            Close
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <div id="qr-temp-canvas" style={{ display: 'none' }}></div>

        {loading && <p>Loading QR details...</p>}
        {error && <p className="error">{error}</p>}

        {qrData && (
          <div className="qr-info">
            <h3>QR Code Details</h3>
            <p><strong>File Name:</strong> {qrData.fileName}</p>

            {qrData.message && (
              <>
                <h4>Message:</h4>
                <div
                  className="qr-message"
                  dangerouslySetInnerHTML={{ __html: qrData.message }}
                ></div>
              </>
            )}

            {qrData.expiration && (
              <p>
                <strong>Expires:</strong>{' '}
                {formatDateDDMMYYYY(qrData.expiration)} at{' '}
                {new Date(qrData.expiration).toLocaleTimeString()}
              </p>
            )}

            {qrData.password && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <strong>Password:</strong>
                <span>{showPassword ? qrData.password : '••••••••'}</span>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                    padding: 0,
                  }}
                  onClick={() => setShowPassword(prev => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            )}

            {qrId && (
              <div>
                <h4>Links:</h4>
                <a
                  href={qrData.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="visit-link"
                >
                  Drive Link
                </a>

                <a
                  href={`/qr/${qrId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="visit-link"
                >
                  QR Link
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRInfoModal;
