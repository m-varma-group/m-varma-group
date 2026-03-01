import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import FileEmbedding from './FileEmbedding';
import FolderFileList from './FolderFileList';
import '../css/QRLandingPage.css';

const QRLandingPage = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [visitorName, setVisitorName] = useState('');
  const [nameError, setNameError] = useState('');

  const [visitorEmail, setVisitorEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const [visitorMobile, setVisitorMobile] = useState('');
  const [mobileError, setMobileError] = useState('');

  const [sourceCollection, setSourceCollection] = useState(null);

  // Load saved visitor name
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qrVisitorName');
      if (saved) setVisitorName(saved);
    } catch (err) {
      console.warn('LocalStorage unavailable', err);
    }
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };

  const deriveNameFromUrl = (url) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length) return decodeURIComponent(parts[parts.length - 1]);
      return u.hostname;
    } catch {
      return url;
    }
  };

  const logAccess = async (name, email, mobile) => {
    try {
      const friendlyName =
        (data && (data.label || data.fileName)) ||
        (data && data.targetUrl ? deriveNameFromUrl(data.targetUrl) : null) ||
        (data && data.isFolder ? 'Folder' : 'File') ||
        'Unknown';

      await addDoc(collection(db, 'qrAccessLogs'), {
        qrId: id,
        name: name || 'Unknown',
        email: email || 'Unknown',
        mobile: mobile || 'Unknown',
        qrName: friendlyName,
        isFolder: !!data?.isFolder,
        timestamp: serverTimestamp(),
        source: sourceCollection || 'unknown',
      });
    } catch (err) {
      console.error('Failed to log access:', err);
    }
  };

  //Auto Continue if Nothing Required
  useEffect(() => {
    if (data && !data.requireVisitorDetails && !data.password) {
      setAuthorized(true);
    }
  }, [data]);
  
  // Fetch QR data
  useEffect(() => {
    const fetchQRData = async () => {
      const tryFetch = async (collectionName) => {
        const snap = await getDoc(doc(db, collectionName, id));
        if (snap.exists()) {
          setSourceCollection(collectionName);
          return snap;
        }
        return null;
      };

      let snap = await tryFetch('qrCodes');
      if (!snap) snap = await tryFetch('qr360');

      if (!snap) {
        setExpired(true);
        setLoading(false);
        return;
      }

      const qrData = snap.data();

      if (qrData.expiration) {
        const exp =
          qrData.expiration.toDate?.() ||
          new Date(qrData.expiration.seconds * 1000);

        if (new Date() > exp) {
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

  const handleContinue = async () => {
    const trimmedName = visitorName.trim();
    const trimmedEmail = visitorEmail.trim();
    const trimmedMobile = visitorMobile.trim();

    if (data?.requireVisitorDetails) {
      if (!trimmedName) {
        setNameError('Please enter your name');
        setTimeout(() => setNameError(''), 3000);
        return;
      }
    
      if (!trimmedEmail) {
        setEmailError('Please enter your email');
        setTimeout(() => setEmailError(''), 3000);
        return;
      }
    
      if (!validateEmail(trimmedEmail)) {
        setEmailError('Please enter a valid email address');
        setTimeout(() => setEmailError(''), 3000);
        return;
      }
    
      if (!trimmedMobile) {
        setMobileError('Please enter your mobile number');
        setTimeout(() => setMobileError(''), 3000);
        return;
      }
    
      if (!validateMobile(trimmedMobile)) {
        setMobileError('Mobile number must be exactly 10 digits');
        setTimeout(() => setMobileError(''), 3000);
        return;
      }
    }

    try {
      localStorage.setItem('qrVisitorName', trimmedName);
    } catch {}

    if (data?.password) {
      if (passwordInput !== data.password) {
        setPasswordError('Incorrect password. Please try again.');
        setTimeout(() => setPasswordError(''), 4000);
        return;
      }
    }

    if (data?.requireVisitorDetails) {
      await logAccess(trimmedName, trimmedEmail, trimmedMobile);
    } else {
      await logAccess(null, null, null);
    }

    setAuthorized(true);
  };

  if (loading) return <div>Loading...</div>;
  if (expired) return <div className="qr-landing-expired">⚠️ QR expired</div>;

  if (!authorized) {
    return (
      <div className="qr-landing-wrapper">
        <div className="qr-landing-container">

          {data?.message && (
            <>
              <h2>NOTE</h2>
              <div
                className="qr-landing-message"
                dangerouslySetInnerHTML={{ __html: data.message }}
              />
              <br />
            </>
          )}

          {data?.requireVisitorDetails && (
            <>
              {/* Name */}
              <div className="qr-password-section">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="qr-name-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                />
                {nameError && <p className="qr-error">{nameError}</p>}
              </div>
          
              {/* Email */}
              <div className="qr-password-section">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  className="qr-email-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                />
                {emailError && <p className="qr-error">{emailError}</p>}
              </div>
          
              {/* Mobile */}
              <div className="qr-password-section">
                <input
                  type="tel"
                  placeholder="Enter your 10-digit mobile number"
                  value={visitorMobile}
                  maxLength={10}
                  onChange={(e) =>
                    setVisitorMobile(e.target.value.replace(/\D/g, ''))
                  }
                  className="qr-mobile-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                />
                {mobileError && <p className="qr-error">{mobileError}</p>}
              </div>
            </>
          )}

          {/* Password if required */}
          {data?.password && (
            <div className="qr-password-section">
              <input
                type="password"
                placeholder="Enter password to continue"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="qr-password-input"
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              />
              {passwordError && (
                <p className="qr-password-error">{passwordError}</p>
              )}
            </div>
          )}

          <button className="qr-landing-button" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (data?.isFolder) {
    return <FolderFileList shortId={id} />;
  }

  return <FileEmbedding url={data?.targetUrl} source={sourceCollection} />;
};

export default QRLandingPage;
