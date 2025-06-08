import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { truncateFileName } from './utils.js';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { Editor } from '@tinymce/tinymce-react';
import '../css/QRgen.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const QRgen = ({ fileId, isFolder, fileName }) => {
  const [showInputModal, setShowInputModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [expiration, setExpiration] = useState(null);
  const [password, setPassword] = useState('');
  const [fadeOutInputModal, setFadeOutInputModal] = useState(false);
  const [fadeOutQRModal, setFadeOutQRModal] = useState(false);
  const [belowQRText, setBelowQRText] = useState('');

  const [enableNote, setEnableNote] = useState(false);
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [enablePassword, setEnablePassword] = useState(false);
  const [enableLabel, setEnableLabel] = useState(false);

  const qrRef = useRef(null);
  const qrInstance = useRef(null);
  const editorRef = useRef(null);

  const baseUrl = isFolder
    ? `https://drive.google.com/drive/folders/${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`;

  const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

  useEffect(() => {
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width: 200,
        height: 200,
        data: '',
        image: '/logo2.2.png',
        dotsOptions: { color: '#000', type: 'square' },
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

  useEffect(() => {
    if (qrRef.current && qrInstance.current && showQR) {
      qrRef.current.innerHTML = '';
      qrInstance.current.append(qrRef.current);
    }
  }, [showQR]);

  const downloadQR = async () => {
  const qrCanvas = qrRef.current.querySelector('canvas');
  if (!qrCanvas) return;

  const width = qrCanvas.width;
  const height = qrCanvas.height + 24;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = height;

  const ctx = finalCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  ctx.drawImage(qrCanvas, 0, 0);

  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(belowQRText, width / 2, qrCanvas.height + 16);

  const link = document.createElement('a');
  link.download = `${safeName}-qr.png`;
  link.href = finalCanvas.toDataURL('image/png');
  link.click();
};


  const handleGenerateClick = () => {
    setShowInputModal(true);
    setFadeOutInputModal(false);
  };

  const handleConfirmInputs = async () => {
    if (enableExpiry && !expiration) {
      alert('Please enter an expiration date and time.');
      return;
    }

    const shortId = nanoid(8);
    const content = enableNote ? editorRef.current.getContent() : '';

    const qrMetadata = {
      targetUrl: baseUrl,
      fileId,
      isFolder,
      fileName,
      createdAt: serverTimestamp(),
    };

    if (enableNote) qrMetadata.message = content;
    if (enableExpiry) qrMetadata.expiration = new Date(expiration);
    if (enablePassword) qrMetadata.password = password;
    if (enableLabel) qrMetadata.label = belowQRText;

    try {
      await setDoc(doc(db, 'qrCodes', shortId), qrMetadata);
      console.log('QR metadata saved with ID:', shortId);

      const landingPageUrl = `${window.location.origin}/qr/${shortId}`;
      qrInstance.current.update({ data: landingPageUrl });

      setFadeOutInputModal(true);
      setTimeout(() => {
        setShowInputModal(false);
        setShowQR(true);
        setFadeOutQRModal(false);
      }, 200);
    } catch (err) {
      console.error('Error saving QR metadata:', err);
      alert('Failed to generate QR. Please try again.');
    }
  };

  const handleCloseInputModal = () => {
    setFadeOutInputModal(true);
    setTimeout(() => setShowInputModal(false), 200);
  };

  const handleCloseQRModal = () => {
    setFadeOutQRModal(true);
    setTimeout(() => setShowQR(false), 200);
  };

  const handleOverlayClick = (e, type) => {
    if (e.target.classList.contains('qr-modal-overlay')) {
      type === 'input' ? handleCloseInputModal() : handleCloseQRModal();
    }
  };

  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); handleGenerateClick(); }}>
        Generate QR
      </button>

      {/* Input Modal */}
      {showInputModal && (
        <div
          className="qr-modal-overlay"
          onClick={(e) => handleOverlayClick(e, 'input')}
        >
          <div className={`qr-modal ${fadeOutInputModal ? 'fade-out' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h3>QR Options for "{truncateFileName(fileName)}"</h3>

            <div className="qr-options-row">
              <label><input type="checkbox" checked={enableNote} onChange={() => setEnableNote(!enableNote)} /> Add Note</label>
              <label><input type="checkbox" checked={enableExpiry} onChange={() => setEnableExpiry(!enableExpiry)} /> Set Expiry</label>
              <label><input type="checkbox" checked={enablePassword} onChange={() => setEnablePassword(!enablePassword)} /> Set Password</label>
              <label><input type="checkbox" checked={enableLabel} onChange={() => setEnableLabel(!enableLabel)} /> Set QR Label</label>
            </div>

            {enableNote && (
              <>
                <p>Add a Note</p>
                <Editor
                  tinymceScriptSrc={`${process.env.PUBLIC_URL}/tinymce/tinymce.min.js`}
                  onInit={(evt, editor) => editorRef.current = editor}
                  init={{
                    height: 400,
                    width: 600,
                    menubar: false,
                    plugins: 'link lists fullscreen',
                    toolbar:
                      'undo redo | formatselect | bold italic underline HR | alignleft aligncenter alignright | bullist | fullscreen',
                    branding: false
                  }}
                />
              </>
            )}

            {enableExpiry && (
              <>
                <p>Set Expiry</p>
                <DatePicker
                  selected={expiration}
                  onChange={(date) => setExpiration(date)}
                  showTimeSelect
                  timeFormat="hh:mm aa"
                  timeIntervals={15}
                  dateFormat="dd MMMM yyyy, hh:mm aa"
                  placeholderText="Select expiration date & time"
                  className="qr-input-expiry"
                  calendarClassName="qr-datepicker-calendar"
                  popperPlacement="bottom"
                />
              </>
            )}

            {enablePassword && (
              <>
                <p>Set Password</p>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="qr-input-password"
                />
              </>
            )}

            {enableLabel && (
              <>
                <p>Set QR Label</p>
                <textarea
                  value={belowQRText}
                  onChange={(e) => {
                    if (e.target.value.length <= 24) {
                      setBelowQRText(e.target.value);
                    }
                  }}
                  placeholder=""
                  className="qr-input-label"
                  maxLength={24}
                />
              </>
            )}

            <div className="qr-button-row">
              <button onClick={handleConfirmInputs}>Generate</button>
              <button onClick={handleCloseInputModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {showQR && (
        <div
          className="qr-modal-overlay"
          onClick={(e) => handleOverlayClick(e, 'qr')}
        >
          <div className={`qr-modal ${fadeOutQRModal ? 'fade-out' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h3>QR for "{truncateFileName(fileName)}"</h3>

            <div className="qr-preview" ref={qrRef}></div>

            {belowQRText && (
              <p style={{ textAlign: 'center', marginTop: '2px', fontWeight: 'normal' }}>
                {belowQRText}
              </p>
            )}

            <div className="qr-button-row">
              <button onClick={downloadQR}>Download</button>
              <button onClick={handleCloseQRModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRgen;
