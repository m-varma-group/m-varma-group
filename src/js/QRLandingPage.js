// QRLandingPage.js
import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const QRLandingPage = () => {
  const { id } = useParams();
//const navigate = useNavigate();
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

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    }, 1000);
  };

  const handleContinue = () => {
    window.location.href = data.targetUrl;
  };

  if (loading) return <div>Loading...</div>;

  if (expired) return <div style={{ textAlign: 'center', padding: '2rem' }}>⚠️ QR expired</div>;

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>📩 Message</h2>
      <p>{data.message || 'No message provided.'}</p>

      <h3>⏳ Validity Remaining</h3>
      <p>{timeLeft}</p>

      <button
        onClick={handleContinue}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '1rem',
          borderRadius: '6px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Continue
      </button>
    </div>
  );
};

export default QRLandingPage;
