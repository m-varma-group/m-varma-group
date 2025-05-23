import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../css/QRLandingPage.css';

const QRLandingPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchQRData = async () => {
      const docRef = doc(db, 'qrCodes', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      const qrData = docSnap.data();

      // Check for expiration if it exists
      if (qrData.expiration) {
        const expirationTime = qrData.expiration.toDate();
        if (new Date() > expirationTime) {
          setExpired(true);
          setLoading(false);
          return;
        }
      }

      setData(qrData);
      setLoading(false);

      // If no password and no message, redirect immediately
      if (!qrData.password && (!qrData.message || qrData.message.trim() === '')) {
        window.location.href = qrData.targetUrl;
      }
    };

    fetchQRData();
  }, [id]);

  const handleContinue = () => {
    if (data.password) {
      if (passwordInput === data.password) {
        window.location.href = data.targetUrl;
      } else {
        setPasswordError('Incorrect password. Please try again.');
        setTimeout(() => setPasswordError(''), 5000);
      }
    } else {
      window.location.href = data.targetUrl;
    }
  };

  if (loading) return <div>Loading...</div>;
  if (expired) return <div className="qr-landing-expired">⚠️ QR expired</div>;

  return (
    <div className="qr-landing-wrapper">
      <div className="qr-landing-container">
        {/* Show Note if present */}
        {data.message && data.message.trim() !== '' && (
          <>
            <h2>NOTE</h2>
            <div
              className="qr-landing-message"
              dangerouslySetInnerHTML={{ __html: data.message }}
            ></div>
          </>
        )}

        {/* Show Password if present */}
        {data.password && (
          <div className="qr-password-section">
            <input
              type="password"
              placeholder="Enter password to continue"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleContinue();
              }}
              className="qr-password-input"
            />
            {passwordError && <p className="qr-password-error">{passwordError}</p>}
          </div>
        )}

        {/* Show Continue Button if either note or password is present */}
        {(data.message?.trim() || data.password) && (
          <button className="qr-landing-button" onClick={handleContinue}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default QRLandingPage;
