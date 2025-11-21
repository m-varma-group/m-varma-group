import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import FileEmbedding from './FileEmbedding';
import FolderFileList from './FolderFileList';
import '../css/QRLandingPage.css';

/**
 * QRLandingPage
 * - Requires user to enter name (saved to localStorage for future visits)
 * - Validates QR expiration
 * - Validates password (if present)
 * - Logs access to Firestore collection 'qrAccessLogs'
 *   Each log contains: qrId, name, qrName (friendly), isFolder, timestamp, source
 */

const QRLandingPage = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // password
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // visitor name
  const [visitorName, setVisitorName] = useState('');
  const [nameError, setNameError] = useState('');

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

  // Write a log entry to Firestore
  // NOTE: Ensure data is available when calling this function (we call it after data is loaded)
  const logAccess = async (name) => {
    try {
      const friendlyName =
        (data && (data.label || data.fileName)) ||
        (data && data.targetUrl ? deriveNameFromUrl(data.targetUrl) : null) ||
        (data && data.isFolder ? 'Folder' : 'File') ||
        'Unknown';

      await addDoc(collection(db, 'qrAccessLogs'), {
        qrId: id,
        name: name || 'Unknown',
        qrName: friendlyName,
        isFolder: !!data?.isFolder,
        timestamp: new Date(),
        source: sourceCollection || 'unknown',
      });
      // optional: console.log('Access logged for', id, name);
    } catch (err) {
      console.error('Failed to log access:', err);
    }
  };

  const deriveNameFromUrl = (url) => {
    try {
      const u = new URL(url);
      // use last pathname segment if present
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length) return decodeURIComponent(parts[parts.length - 1]);
      return u.hostname;
    } catch {
      return url;
    }
  };

  // Fetch QR data (from qrCodes or qr360)
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

      // expiration check
      if (qrData.expiration) {
        const exp = qrData.expiration.toDate?.() || new Date(qrData.expiration.seconds * 1000);
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

    // safety: prevent easy copy
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

  // Continue button handler (validates name and password, stores name, logs access)
  const handleContinue = async () => {
    const trimmed = (visitorName || '').trim();
    if (!trimmed) {
      setNameError('Please enter your name');
      setTimeout(() => setNameError(''), 3000);
      return;
    }

    // store for future visits
    try {
      localStorage.setItem('qrVisitorName', trimmed);
    } catch (err) {
      // ignore
    }

    // password check
    if (data?.password) {
      if (passwordInput !== data.password) {
        setPasswordError('Incorrect password. Please try again.');
        setTimeout(() => setPasswordError(''), 4000);
        return;
      }
    }

    // Ensure data loaded before logging
    if (!data) {
      console.warn('QR data not available yet for logging. Aborting log.');
    } else {
      await logAccess(trimmed);
    }

    setAuthorized(true);
  };

  if (loading) return <div>Loading...</div>;
  if (expired) return <div className="qr-landing-expired">⚠️ QR expired</div>;

  // before access: always require name (and optionally password)
  if (!authorized) {
    return (
      <div className="qr-landing-wrapper">
        <div className="qr-landing-container">
          {/* show NOTE if present */}
          {data?.message && (
            <>
              <h2>NOTE</h2>
              <div className="qr-landing-message" dangerouslySetInnerHTML={{ __html: data.message }} />
              <br />
            </>
          )}

          {/* Name (mandatory) */}
          <div className="qr-password-section">
            <input
              type="text"
              placeholder="Enter your name (required)"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className="qr-name-input"
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            />
            {nameError && <p className="qr-error">{nameError}</p>}
          </div>

          {/* password if required */}
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
              {passwordError && <p className="qr-password-error">{passwordError}</p>}
            </div>
          )}

          <button className="qr-landing-button" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // after access: folder or file
  if (data?.isFolder) {
    return <FolderFileList shortId={id} />;
  }

  return <FileEmbedding url={data?.targetUrl} source={sourceCollection} />;
};

export default QRLandingPage;
