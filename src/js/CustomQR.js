import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling'; // QR code library for styled QR generation
import '../css/CustomQR.css'; // Importing custom CSS for the QR modal

// Initialize a single QRCodeStyling instance with base configuration
const qrCode = new QRCodeStyling({
  width: 200,
  height: 200,
  type: 'canvas',
  image: '/logo.png', // Optional logo in center
  qrOptions: {
    errorCorrectionLevel: 'H', // High error correction level
    margin: 16,
  },
  dotsOptions: {
    color: '#000',
    type: 'rounded', // Rounded QR dots
  },
  backgroundOptions: {
    color: '#ffffff', // White background
  },
  imageOptions: {
    crossOrigin: 'anonymous',
    imageSize: 0.5, // Scale of logo in the center
  },
});

// Main component to generate and manage QR code based on a link
const CustomQR = ({ customLink, setCustomLink, onClose }) => {
  const qrRef = useRef(null); // Reference to DOM element where QR is injected
  const [fileName, setFileName] = useState(''); // Optional file name for download
  const [fadeOut, setFadeOut] = useState(false); // Fade-out animation for modal

  // Update QR code whenever customLink changes
  useEffect(() => {
    if (customLink && qrRef.current) {
      qrCode.update({ data: customLink });
      qrRef.current.innerHTML = ''; // Clear old canvas
      qrCode.append(qrRef.current); // Inject updated QR canvas
    }
  }, [customLink]);

  // Function to download the QR code as a PNG with white padding
  const downloadQR = async () => {
    const blob = await qrCode.getRawData('png');
    const img = new Image();
    const safeName = (fileName || 'custom-link').replace(/[^\w\d_.-]/g, '_'); // Sanitize file name

    img.onload = () => {
      const padding = 10;
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
      a.click(); // Trigger download
    };

    img.src = URL.createObjectURL(blob); // Load blob into image
  };

  // Close the modal with a fade-out animation
  const handleClose = () => {
    setFadeOut(true);
    setTimeout(() => {
      onClose(); // Trigger parent callback to unmount modal
    }, 200); // Match CSS fade duration
  };

  // Clear the QR input and preview
  const handleClear = () => {
    setCustomLink('');
    setFileName('');
    if (qrRef.current) qrRef.current.innerHTML = '';
  };

  return (
    <div className="qr-modal-overlay" onClick={handleClose}>
      {/* Main modal container with fade effect */}
      <div
        className={`qr-modal ${fadeOut ? 'fade-out' : ''}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <h3>Add a Link to Generate QR</h3>

        {/* Input for custom link */}
        <input
          type="text"
          className="qr-input-url"
          placeholder="Enter any URL"
          value={customLink}
          onChange={(e) => setCustomLink(e.target.value)}
        />

        {/* QR preview and controls: only shown when there's a link */}
        {customLink && (
          <div className="qr-preview">
            <div ref={qrRef} /> {/* QR will be injected here */}

            {/* Optional file name input */}
            <input
              type="text"
              className="qr-input-filename"
              placeholder="File name (optional)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />

            {/* Button row: Download, Clear, Close */}
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
