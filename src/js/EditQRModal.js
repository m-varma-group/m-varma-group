// EditQRModal.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Editor } from '@tinymce/tinymce-react';
import '../css/EditQRModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const EditQRModal = ({ onClose }) => {
  const [qrImage, setQrImage] = useState(null);
  const [qrId, setQrId] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState({
    message: '',
    password: '',
    expiration: null
  });
  const [closing, setClosing] = useState(false);
  const [collection, setCollection] = useState('qrCodes');

  const fileInputRef = useRef();
  const modalRef = useRef();
  const editorRef = useRef(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match fadeOut duration
  }, [onClose]);

  const handleClear = () => {
    setQrImage(null);
    setQrId(null);
    setQrData({ message: '', password: '', expiration: null });
    setStatus('');
    setError('');
  };

const scanImage = async (file) => {
  const qrCode = new Html5Qrcode('edit-qr-canvas');
  try {
    const result = await qrCode.scanFile(file, true);
    const idMatch = result.match(/\/qr\/([^/]+)/);
    const id = idMatch ? idMatch[1] : null;
    if (!id) throw new Error('Invalid QR code');

    setQrId(id);

    const tryGetDoc = async (col) => {
      const snap = await getDoc(doc(db, col, id));
      return snap.exists() ? { data: snap.data(), col } : null;
    };

    let found = await tryGetDoc('qrCodes');
    if (!found) found = await tryGetDoc('qr360');

    if (!found) {
      setError('QR ID not found in Firestore.');
      return;
    }

    setCollection(found.col);

    const data = found.data;
    setQrData({
      message: data.message || '',
      password: data.password || '',
      expiration: data.expiration?.seconds
        ? new Date(data.expiration.seconds * 1000)
        : data.expiration || null
    });
  } catch (err) {
    console.error(err);
    setError('QR scan failed. Make sure it contains /qr/:id');
  }
};

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Invalid image file.');
      return;
    }
    setQrImage(URL.createObjectURL(file));
    await scanImage(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Invalid image file.');
      return;
    }
    setQrImage(URL.createObjectURL(file));
    await scanImage(file);
  };

const handleUpdate = async () => {
  if (!qrId || !collection) {
    setError('No valid QR ID or collection detected.');
    return;
  }

  try {
    const updatedMessage = editorRef.current?.getContent() || '';
    await updateDoc(doc(db, collection, qrId), {
      message: updatedMessage,
      password: qrData.password,
      expiration: qrData.expiration,
      updatedAt: new Date()
    });
    setStatus('QR updated successfully.');
  } catch (err) {
    console.error(err);
    setError('Failed to update QR in Firestore.');
  }
};


  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleClose]);

  useEffect(() => {
    if (status || error) {
        const timer = setTimeout(() => {
        setStatus('');
        setError('');
        }, 5000);
        return () => clearTimeout(timer);
    }
    }, [status, error]);


  return (
    <div className="qr-info-modal-backdrop">
      <div
        className={`qr-info-modal custom-qr-modal ${closing ? 'fade-out' : ''}`}
        ref={modalRef}
      >
        <button className="close-btn" onClick={handleClose}>×</button>
        <h2>Update QR Code</h2>

        {!qrImage && (
          <div className="qr-dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
            <p>Drag and drop a QR code image here</p>
          </div>
        )}

        {qrImage && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <img
                src={qrImage}
                alt="QR Preview"
                style={{
                  maxWidth: '180px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
            </div>

            <div className="qr-form-fields">
              <div style={{ marginBottom: '16px' }}>
                <label>Note</label>
                <Editor
                  tinymceScriptSrc={`${process.env.PUBLIC_URL}/tinymce/tinymce.min.js`}
                  onInit={(evt, editor) => {
                    editorRef.current = editor;
                  }}
                  initialValue={qrData.message}
                  init={{
                    height: 200,
                    menubar: false,
                    plugins: 'link lists fullscreen',
                    toolbar:
                      'undo redo | formatselect | bold italic underline HR | alignleft aligncenter alignright | bullist | fullscreen',
                    branding: false
                  }}
                />
              </div>

              <label>Password</label>
              <input
                className="qr-input-url"
                type="text"
                value={qrData.password}
                onChange={(e) => setQrData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />

              <label>Expiration</label>
              <DatePicker
                selected={qrData.expiration}
                onChange={(date) => setQrData(prev => ({ ...prev, expiration: date }))}
                showTimeSelect
                dateFormat="dd MMM yyyy, hh:mm aa"
                placeholderText="Select expiration date & time"
                className="qr-input-url"
              />
            </div>
          </>
        )}

        <div className="upload-btn-group">
          <button className="upload-btn" onClick={() => fileInputRef.current.click()}>Upload QR Image</button>
          <button className="upload-btn" onClick={handleUpdate} style={{ backgroundColor: '#28a745' }}>Update</button>
          <button className="upload-btn" onClick={handleClear} style={{ backgroundColor: '#ffc107', color: '#000' }}>Clear</button>
          <button className="upload-btn" onClick={handleClose} style={{ backgroundColor: '#6c757d' }}>Close</button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <div id="edit-qr-canvas" style={{ display: 'none' }}></div>

        {error && <p className="error">{error}</p>}
        {status && <p className="success">{status}</p>}
      </div>
    </div>
  );
};

export default EditQRModal;
