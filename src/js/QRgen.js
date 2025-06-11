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
  const [qrUrl, setQrUrl] = useState(''); // Store the generated QR URL

  const [enableNote, setEnableNote] = useState(false);
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [enablePassword, setEnablePassword] = useState(false);
  const [enableLabel, setEnableLabel] = useState(false);

  // New: Controlled note content state
  const [noteContent, setNoteContent] = useState('');

  const qrRef = useRef(null);
  const qrInstance = useRef(null);

  const baseUrl = isFolder
    ? `https://drive.google.com/drive/folders/${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`;

  const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

  const STORAGE_KEY = `qrgen-${fileId}`;

  // Initialize QRCodeStyling instance once
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

  // Append QR code to container when showQR changes
  useEffect(() => {
    if (qrRef.current && qrInstance.current && showQR) {
      qrRef.current.innerHTML = '';
      qrInstance.current.append(qrRef.current);
    }
  }, [showQR]);

  // Open input modal and load saved data if any
  const handleGenerateClick = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const {
        note,
        expiration,
        password,
        label,
        enableNote,
        enableExpiry,
        enablePassword,
        enableLabel,
      } = JSON.parse(saved);

      setBelowQRText(label || '');
      setPassword(password || '');
      setExpiration(expiration ? new Date(expiration) : null);

      setEnableNote(enableNote || false);
      setEnableExpiry(enableExpiry || false);
      setEnablePassword(enablePassword || false);
      setEnableLabel(enableLabel || false);

      setNoteContent(note || '');
    } else {
      // Reset if no saved data
      setNoteContent('');
      setExpiration(null);
      setPassword('');
      setBelowQRText('');
      setEnableNote(false);
      setEnableExpiry(false);
      setEnablePassword(false);
      setEnableLabel(false);
    }
    setShowInputModal(true);
    setFadeOutInputModal(false);
  };

  // Save current form data to localStorage
  const saveTempData = () => {
    const data = {
      note: enableNote ? noteContent : '',
      expiration: enableExpiry ? expiration : null,
      password,
      label: belowQRText,
      enableNote,
      enableExpiry,
      enablePassword,
      enableLabel,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // Clear localStorage temp data and reset note content state
  const clearTempData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setNoteContent('');
  };

// Download QR code image with label below
const downloadQR = async () => {
  const qrCanvas = qrRef.current.querySelector('canvas');
  if (!qrCanvas) return;
  const width = qrCanvas.width;
  
  // Dynamic height based on text length
  const height = belowQRText.length > 30 ? qrCanvas.height + 34 : qrCanvas.height + 24;
  
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = height;
  const ctx = finalCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  ctx.drawImage(qrCanvas, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.font = belowQRText.length <= 24 ? '12px Arial' : '10px Arial';
  ctx.textAlign = 'center';
 
  // Split text into lines of max 30 characters
  const line1 = belowQRText.substring(0, 30);
  const line2 = belowQRText.substring(30);
 
  ctx.fillText(line1, width / 2, qrCanvas.height + 16);
  if (line2) {
    ctx.fillText(line2, width / 2, qrCanvas.height + 30);
  }
 
  const link = document.createElement('a');
  link.download = `${safeName}-qr.png`;
  link.href = finalCanvas.toDataURL('image/png');
  link.click();
};

  // Copy QR URL to clipboard
  const copyQRLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = qrUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
    }
  };

  // On confirm, validate inputs, save metadata to Firestore, and generate QR code data URL
  const handleConfirmInputs = async () => {
    if (enableExpiry && !expiration) {
      alert('Please enter an expiration date and time.');
      return;
    }

    const shortId = nanoid(8);

    const qrMetadata = {
      targetUrl: baseUrl,
      fileId,
      isFolder,
      fileName,
      createdAt: serverTimestamp(),
    };

    if (enableNote) qrMetadata.message = noteContent;
    if (enableExpiry) qrMetadata.expiration = new Date(expiration);
    if (enablePassword) qrMetadata.password = password;
    if (enableLabel) qrMetadata.label = belowQRText;

    try {
      await setDoc(doc(db, 'qrCodes', shortId), qrMetadata);
      console.log('QR metadata saved with ID:', shortId);

      clearTempData();

      const landingPageUrl = `${window.location.origin}/qr/${shortId}`;
      setQrUrl(landingPageUrl); // Store the URL for copying
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

  // Close input modal and save temporary data
  const handleCloseInputModal = () => {
    saveTempData();
    setFadeOutInputModal(true);
    setTimeout(() => setShowInputModal(false), 200);
  };

  // Close QR modal
  const handleCloseQRModal = () => {
    setFadeOutQRModal(true);
    setTimeout(() => setShowQR(false), 200);
  };

  // Close modals on overlay click
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
        <div className="qr-modal-overlay" onClick={(e) => handleOverlayClick(e, 'input')}>
          <div
            className={`qr-modal ${fadeOutInputModal ? 'fade-out' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>QR Options for "{truncateFileName(fileName)}"</h3>

            <div className="qr-options-row">
              <label>
                <input
                  type="checkbox"
                  checked={enableNote}
                  onChange={() => setEnableNote(!enableNote)}
                /> Add Note
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={enableExpiry}
                  onChange={() => setEnableExpiry(!enableExpiry)}
                /> Set Expiry
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={() => setEnablePassword(!enablePassword)}
                /> Set Password
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={enableLabel}
                  onChange={() => setEnableLabel(!enableLabel)}
                /> Set QR Label
              </label>
            </div>

            {enableNote && (
              <>
                <p>Add a Note</p>
                <Editor
                  tinymceScriptSrc={`${process.env.PUBLIC_URL}/tinymce/tinymce.min.js`}
                  value={noteContent}
                  onEditorChange={(content) => setNoteContent(content)}
                  init={{
                    height: 400,
                    width: 600,
                    menubar: false,
                    plugins: 'link lists fullscreen',
                    toolbar:
                      'undo redo | formatselect | bold italic underline | alignleft aligncenter alignright | bullist | fullscreen',
                    branding: false,
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
                    if (e.target.value.length <= 58) {
                      setBelowQRText(e.target.value);
                    }
                  }}
                  placeholder=""
                  className="qr-input-label"
                  maxLength={58}
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
        <div className="qr-modal-overlay" onClick={(e) => handleOverlayClick(e, 'qr')}>
          <div
            className={`qr-modal ${fadeOutQRModal ? 'fade-out' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>QR for "{truncateFileName(fileName)}"</h3>
            <div className="qr-preview" ref={qrRef}></div>

            {belowQRText && (
              <p
                style={{ textAlign: 'center', marginTop: '2px', fontWeight: 'normal' }}
              >
                {belowQRText}
              </p>
            )}

            <div className="qr-button-row">
              <button onClick={downloadQR}>Download</button>
              <button onClick={copyQRLink}>Copy Link</button>
              <button onClick={handleCloseQRModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRgen;