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
  const [sourceCollection, setSourceCollection] = useState(null); // NEW

  useEffect(() => {
    const fetchQRData = async () => {
      const tryFetch = async (collection) => {
        const snap = await getDoc(doc(db, collection, id));
        if (snap.exists()) {
          setSourceCollection(collection); // Set source
          return snap;
        }
        return null;
      };

      let docSnap = await tryFetch('qrCodes');
      if (!docSnap) docSnap = await tryFetch('qr360');

      if (!docSnap) {
        setExpired(true);
        setLoading(false);
        return;
      }

      const qrData = docSnap.data();

      if (qrData.expiration) {
        const expirationDate =
          qrData.expiration.toDate?.() ||
          new Date(qrData.expiration.seconds * 1000);

        if (new Date() > expirationDate) {
          setExpired(true);
          setLoading(false);
          return;
        }
      }

      setData(qrData);
      setLoading(false);

      if (!qrData.password && !qrData.message) {
        setAuthorized(true);
      }
    };

    fetchQRData();

    const disableRightClick = (e) => e.preventDefault();
    const disableKeys = (e) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'u')) || e.key === 'F12') {
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
    if (data.password) {
      if (passwordInput !== data.password) {
        setPasswordError('Incorrect password. Please try again.');
        setTimeout(() => setPasswordError(''), 5000);
        return;
      }
    }
    setAuthorized(true);
  };

  if (loading) return <div>Loading...</div>;
  if (expired) return <div className="qr-landing-expired">⚠️ QR expired</div>;

  if (!authorized) {
    return (
      <div className="qr-landing-wrapper">
        <div className="qr-landing-container">
          {/* Note section */}
          {data.message && (
            <>
              <h2>NOTE</h2>
              <div
                className="qr-landing-message"
                dangerouslySetInnerHTML={{ __html: data.message }}
              />
            </>
          )}

          {/* Password section */}
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
              {passwordError && (
                <p className="qr-password-error">{passwordError}</p>
              )}
            </div>
          )}

          {/* Only show Continue if there's a note or password */}
          {(data.message || data.password) && (
            <button className="qr-landing-button" onClick={handleContinue}>
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  return <FileEmbedding url={data.targetUrl} source={sourceCollection} />;
};

export default QRLandingPage;
