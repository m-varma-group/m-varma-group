// QRLandingPage.js
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
      const expirationTime = qrData.expiration.toDate();
      const now = new Date();

      if (now > expirationTime) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setData(qrData);
      setLoading(false);
      updateCountdown(expirationTime);
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


  const handleContinue = () => {
    window.location.href = data.targetUrl;
  };

  if (loading) return <div>Loading...</div>;

  if (expired)
  return <div className="qr-landing-expired">⚠️ QR expired</div>;

return (
  <div className="qr-landing-wrapper">
    <div className="qr-landing-container">
      <h2>NOTE</h2>
      <div
        className="qr-landing-message"
        dangerouslySetInnerHTML={{
          __html: data.message || '<p>No message provided.</p>',
        }}
      ></div>

      <h3 className="qr-landing-validity">⏳ Validity Remaining</h3>
      <p>{timeLeft}</p>

      <button className="qr-landing-button" onClick={handleContinue}>
        Continue
      </button>
    </div>
  </div>
);


};

export default QRLandingPage;
