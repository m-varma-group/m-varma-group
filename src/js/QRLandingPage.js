import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import FileEmbedding from './FileEmbedding';
import '../css/QRLandingPage.css';

const QRLandingPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [noteAcknowledged, setNoteAcknowledged] = useState(false);

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
    };

    fetchQRData();

    const disableRightClick = (e) => e.preventDefault();
    const disableKeys = (e) => {
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableKeys);

    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableKeys);
    };
  }, [id]);

  const handleContinue = () => {
    if (data.message && !noteAcknowledged) {
      setNoteAcknowledged(true);
      return;
    }

    if (data.password) {
      if (passwordInput === data.password) {
        setAuthorized(true);
      } else {
        setPasswordError('Incorrect password. Please try again.');
        setTimeout(() => setPasswordError(''), 5000);
      }
    } else {
      setAuthorized(true);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (expired) return <div className="qr-landing-expired">⚠️ QR expired</div>;

  if (!authorized) {
    return (
      <div className="qr-landing-wrapper">
        <div className="qr-landing-container">
          {/* Step 1: Show Note */}
          {data.message && !noteAcknowledged && (
            <>
              <h2>NOTE</h2>
              <div
                className="qr-landing-message"
                dangerouslySetInnerHTML={{ __html: data.message }}
              />
              <button className="qr-landing-button" onClick={handleContinue}>
                Continue
              </button>
            </>
          )}

          {/* Step 2: Show Password (if needed) */}
          {(noteAcknowledged || !data.message) && data.password && !authorized && (
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
              <button className="qr-landing-button" onClick={handleContinue}>
                Continue
              </button>
            </div>
          )}

          {/* Auto-authorize when there's no password and note is acknowledged */}
          {(noteAcknowledged && !data.password) && setAuthorized(true)}
        </div>
      </div>
    );
  }

  // Step 3: Show file
  return <FileEmbedding url={data.targetUrl} />;
};

export default QRLandingPage;
