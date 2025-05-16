// Import React and required hooks
import React, { useEffect, useRef, useState } from 'react';

// Import QRCodeStyling library to generate custom-styled QR codes
import QRCodeStyling from 'qr-code-styling';

// Import helper function to truncate long filenames
import { truncateFileName } from './utils.js';

// Import styles specific to QR generator modal
import '../css/QRgen.css';

// QRgen component generates and displays a QR code for a file or folder
const QRgen = ({ fileId, isFolder, fileName }) => {
  // Track whether the QR modal is visible
  const [showQR, setShowQR] = useState(false);

  // Reference to the DOM node where QR code will be rendered
  const qrRef = useRef(null);

  // Store the QRCodeStyling instance to avoid re-creating it on every render
  const qrInstance = useRef(null);

  // Generate a shareable URL based on whether the item is a folder or file
  const url = isFolder
    ? `https://drive.google.com/drive/folders/${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`;

  // Create a safe filename by removing illegal characters for download
  const safeName = fileName.replace(/[^\w\d_.-]/g, '_');

  // useEffect runs when the URL or showQR state changes
  useEffect(() => {
    // Initialize the QR code once if not already created
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width: 200, // QR code width
        height: 200, // QR code height
        data: url, // Initial data to encode
        image: '/logo.png', // Optional logo image in the QR
        dotsOptions: {
          color: '#000',
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 0,
          imageSize: 0.6, // Logo size relative to QR code
        },
        qrOptions: {
          errorCorrectionLevel: 'H', // High error correction for image/logo
        },
      });
    } else {
      // If already created, just update the data (URL)
      qrInstance.current.update({
        data: url,
      });
    }

    // Append the QR code to the container only if modal is visible
    if (qrRef.current && showQR) {
      qrRef.current.innerHTML = ''; // Clear previous QR
      qrInstance.current.append(qrRef.current); // Render updated QR
    }
  }, [url, showQR]); // Re-run effect if URL or visibility changes

  // Trigger QR code download
  const downloadQR = () => {
    qrInstance.current.download({
      name: `${safeName}-qr`, // Download name
      extension: 'png',       // File type
    });
  };

  // JSX returned by the component
  return (
    <>
      {/* Button to show the QR modal */}
      <button onClick={(e) => { e.stopPropagation(); setShowQR(true); }}>
        Generate QR
      </button>

      {/* QR modal only shown if showQR is true */}
      {showQR && (
        <div className="qr-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal-gen">
            {/* Modal heading with truncated file name */}
            <h3>QR for "{truncateFileName(fileName)}"</h3>

            {/* QR code container */}
            <div ref={qrRef}></div>

            {/* Download and close buttons */}
            <button onClick={downloadQR}>Download QR</button>
            <button onClick={() => setShowQR(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

// Export the component for use in other parts of the app
export default QRgen;
