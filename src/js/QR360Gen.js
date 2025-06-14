import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { Editor } from '@tinymce/tinymce-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/QRgen.css';

const QR360Gen = ({ url, fileName }) => {
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

  // NEW: note content as controlled state
  const [noteContent, setNoteContent] = useState('');

  const qrRef = useRef(null);
  const qrInstance = useRef(null);

  const localKey = `qr360-${fileName}`;
  const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

  // Initialize QR instance once
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

  // Append QR to DOM on showQR change
  useEffect(() => {
    if (qrRef.current && qrInstance.current && showQR) {
      qrRef.current.innerHTML = '';
      qrInstance.current.append(qrRef.current);
    }
  }, [showQR]);

  // Load saved data from localStorage on input modal open
  useEffect(() => {
    if (showInputModal) {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setEnableNote(data.enableNote || false);
          setEnableExpiry(data.enableExpiry || false);
          setEnablePassword(data.enablePassword || false);
          setEnableLabel(data.enableLabel || false);
          setPassword(data.password || '');
          setBelowQRText(data.belowQRText || '');
          setExpiration(data.expiration ? new Date(data.expiration) : null);
          setNoteContent(data.note || '');
        } catch (err) {
          console.error('Error parsing saved QR data:', err);
          setNoteContent('');
        }
      } else {
        // Reset all states if no saved data
        setEnableNote(false);
        setEnableExpiry(false);
        setEnablePassword(false);
        setEnableLabel(false);
        setPassword('');
        setBelowQRText('');
        setExpiration(null);
        setNoteContent('');
      }
    }
  }, [showInputModal, localKey]);

  // Save form data to localStorage whenever relevant data changes (only when modal open)
  useEffect(() => {
    if (!showInputModal) return;

    const data = {
      enableNote,
      enableExpiry,
      enablePassword,
      enableLabel,
      password,
      belowQRText,
      expiration: expiration ? expiration.toISOString() : null,
      note: noteContent,
    };
    localStorage.setItem(localKey, JSON.stringify(data));
  }, [
    enableNote,
    enableExpiry,
    enablePassword,
    enableLabel,
    password,
    belowQRText,
    expiration,
    noteContent,
    showInputModal,
    localKey,
  ]);

  const clearLocalData = () => {
    localStorage.removeItem(localKey);
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
    const content = enableNote ? noteContent : '';

    const qrMetadata = {
      targetUrl: url,
      fileName,
      createdAt: serverTimestamp(),
    };

    if (enableNote) qrMetadata.message = content;
    if (enableExpiry) qrMetadata.expiration = expiration ? expiration.toISOString() : null;
    if (enablePassword) qrMetadata.password = password;
    if (enableLabel) qrMetadata.label = belowQRText;

    try {
      await setDoc(doc(db, 'qr360', shortId), qrMetadata);
      console.log('QR metadata saved with ID:', shortId);

      const landingPageUrl = `${window.location.origin}/qr/${shortId}`;
      setQrUrl(landingPageUrl); // Store the URL for copying
      qrInstance.current.update({ data: landingPageUrl });

      clearLocalData();

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
    setTimeout(() => {
      setShowInputModal(false);
    }, 200);
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
        <div className="qr-modal-overlay" onClick={(e) => handleOverlayClick(e, 'input')}>
          <div className={`qr-modal ${fadeOutInputModal ? 'fade-out' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h3>QR Options for "{fileName}"</h3>

            <div className="qr-options-row">
              <label>
                <input type="checkbox" checked={enableNote} onChange={() => setEnableNote(!enableNote)} /> Add Note
              </label>
              <label>
                <input type="checkbox" checked={enableExpiry} onChange={() => setEnableExpiry(!enableExpiry)} /> Set Expiry
              </label>
              <label>
                <input type="checkbox" checked={enablePassword} onChange={() => setEnablePassword(!enablePassword)} /> Set Password
              </label>
              <label>
                <input type="checkbox" checked={enableLabel} onChange={() => setEnableLabel(!enableLabel)} /> Set QR Label
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
                    toolbar: 'undo redo | formatselect | bold italic underline HR | alignleft aligncenter alignright | bullist | fullscreen',
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
                <div style={{ position: 'relative', textAlign: 'center', marginBottom: '5px' }}>
                  <p style={{ margin: 0 }}>Set QR Label</p>
                  <span style={{ 
                    position: 'absolute', 
                    right: 0, 
                    top: 0, 
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    {belowQRText.length}/58
                  </span>
                </div>
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
              <button onClick={() => { clearLocalData(); handleCloseInputModal(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="qr-modal-overlay" onClick={(e) => handleOverlayClick(e, 'qr')}>
          <div className={`qr-modal ${fadeOutQRModal ? 'fade-out' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h3>QR for "{fileName}"</h3>
            <div className="qr-preview" ref={qrRef}></div>
            {belowQRText && <p style={{ textAlign: 'center', marginTop: '2px' }}>{belowQRText}</p>}
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

export default QR360Gen;