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
  const [expiration, setExpiration] = useState(new Date());
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
        image: '/logo.png',
        dotsOptions: { color: '#000', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 0,
          imageSize: 0.5,
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

    const shortId = nanoid(8);
    const content = editorRef.current.getContent();

    const qrMetadata = {
      message: content,
      expiration: new Date(expiration),
      targetUrl: baseUrl,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'qrCodes', shortId), qrMetadata);
      console.log('QR metadata saved with ID:', shortId);

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

            <p> Add a Note </p>
            <Editor
              tinymceScriptSrc={`${process.env.PUBLIC_URL}/tinymce/tinymce.min.js`}
              onInit={(evt, editor) => editorRef.current = editor}
              init={{
                height: 400,
                width: 600,
                menubar: false,
                plugins: 'link lists fullscreen',
                toolbar:
                  'undo redo | formatselect | bold italic underline HR | alignleft aligncenter alignright | bullist numlist | fullscreen',
                branding: false
              }}
            />


            
            <p> Set Expiry </p>
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
