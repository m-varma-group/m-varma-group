import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../css/QRLandingPage.css';

const QRLandingPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordValid, setPasswordValid] = useState(false);
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
        const now = new Date();

        if (now > expirationTime) {
          setExpired(true);
          setLoading(false);
          return;
        }

        updateCountdown(expirationTime);
      }

      setData(qrData);
      setLoading(false);
    };

    fetchQRData();
  }, [id]);
  
  const updateCountdown = (expirationTime) => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expirationTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        setExpired(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
    }, 1000);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === data.password) {
      setPasswordValid(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');

      // Clear error after 5 seconds
      setTimeout(() => {
        setPasswordError('');
      }, 5000);
    }
  };

  const handleContinue = () => {
    window.location.href = data.targetUrl;
  };

  if (loading) return <div>Loading...</div>;
  if (expired) return <div className="qr-landing-expired">⚠️ QR expired</div>;

  return (
    <div className="qr-landing-wrapper">
      <div className="qr-landing-container">

        {/* Optional Message */}
        {data.message && data.message.trim() !== '' && (
          <>
            <h2>NOTE</h2>
            <div
              className="qr-landing-message"
              dangerouslySetInnerHTML={{ __html: data.message }}
            ></div>
          </>
        )}

        {/* Optional Expiry Countdown */}
        {data.expiration && (
          <>
            <h3 className="qr-landing-validity">⚠️ LINK EXPIRES IN</h3>
            <p>{timeLeft}</p>
          </>
        )}

        {/* Optional Password Protection */}
        {data.password && !passwordValid && (
          <div className="qr-password-section">
            <input
              type="password"
              placeholder="Enter password to continue"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit();
              }}
              className="qr-password-input"
            />
            {passwordError && <p className="qr-password-error">{passwordError}</p>}
            <button onClick={handlePasswordSubmit} className="qr-password-submit">
              Submit
            </button>
          </div>
        )}

        {/* Continue Button if no password or password validated */}
        {(!data.password || passwordValid) && (
          <button className="qr-landing-button" onClick={handleContinue}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default QRLandingPage;
