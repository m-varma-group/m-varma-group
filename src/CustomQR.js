import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import './CustomQR.css';

const qrCode = new QRCodeStyling({
  width: 200,
  height: 200,
  type: 'canvas',
  image: '/logo192.png',
  qrOptions: {
    errorCorrectionLevel: 'H',
    margin: 16,
  },
  dotsOptions: {
    color: '#000',
    type: 'rounded',
  },
  backgroundOptions: {
    color: '#ffffff',
  },
  imageOptions: {
    crossOrigin: 'anonymous',
    imageSize: 0.5,
  },
});

const CustomQR = ({ customLink, setCustomLink, onClose }) => {
  const qrRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [fadeOut, setFadeOut] = useState(false);

  // Safe rendering logic
  useEffect(() => {
  if (customLink && qrRef.current) {
    qrCode.update({ data: customLink });
    qrRef.current.innerHTML = ''; 
    qrCode.append(qrRef.current);
  }
}, [customLink]);


  const downloadQR = async () => {
  const blob = await qrCode.getRawData('png');
  const img = new Image();
  const safeName = (fileName || 'custom-link').replace(/[^\w\d_.-]/g, '_');

  img.onload = () => {
    const padding = 10; // pixels of white space
    const canvas = document.createElement('canvas');
    canvas.width = img.width + padding * 2;
    canvas.height = img.height + padding * 2;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, padding, padding);

    const finalUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = finalUrl;
    a.download = `${safeName}-qr.png`;
    a.click();
  };

  img.src = URL.createObjectURL(blob);
};


  const handleClose = () => {
    setFadeOut(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleClear = () => {
    setCustomLink('');
    setFileName('');
    if (qrRef.current) qrRef.current.innerHTML = '';
  };

  return (
    <div className="qr-modal-overlay" onClick={handleClose}>
      <div
        className={`qr-modal ${fadeOut ? 'fade-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Add a Link to Generate QR</h3>
        <input
          type="text"
          className="qr-input-url"
          placeholder="Enter any URL"
          value={customLink}
          onChange={(e) => setCustomLink(e.target.value)}
        />

        {customLink && (
          <div className="qr-preview">
            <div ref={qrRef} />
            <input
              type="text"
              className="qr-input-filename"
              placeholder="File name (optional)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <div className="qr-button-row">
              <button onClick={downloadQR}>Download</button>
              <button onClick={handleClear}>Clear</button>
              <button onClick={handleClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomQR;
