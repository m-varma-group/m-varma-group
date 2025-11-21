// EditQRModal.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  doc,
  getDoc,
  updateDoc,
  collection as firestoreCollection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Editor } from '@tinymce/tinymce-react';
import '../css/EditQRModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import QRCodeStyling from 'qr-code-styling';
import { getFolderChildren } from './utils.js';

const EditQRModal = ({ onClose }) => {
  const [qrImage, setQrImage] = useState(null);
  const [qrId, setQrId] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState({
    message: '',
    password: '',
    expiration: null,
    label: '',
    targetUrl: '',
    isFolder: false,
    fileId: null,
    folderId: null,
    folderContents: [],
    folderUrls: [],
    hasNestedStructure: false,
    totalItems: 0
  });
  const [originalLabel, setOriginalLabel] = useState('');
  const [closing, setClosing] = useState(false);

  // IMPORTANT: do NOT name this `collection` (that collides with Firestore import)
  const [qrCollection, setCollection] = useState('qrCodes');

  const [qrLink, setQrLink] = useState('');
  const [inputMethod, setInputMethod] = useState('image');
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false);

  const accessToken = localStorage.getItem('accessToken');
  const fileInputRef = useRef();
  const modalRef = useRef();
  const editorRef = useRef(null);
  const qrInstanceRef = useRef(null);

  // ----------------- helpers -----------------
  const sanitizeFilename = (filename) => {
    if (!filename || filename.trim() === '') return 'qr-code';
    return filename
      .trim()
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\.+$/g, '')
      .substring(0, 100);
  };

  useEffect(() => {
    if (!qrInstanceRef.current) {
      qrInstanceRef.current = new QRCodeStyling({
        width: 200,
        height: 200,
        data: '',
        image: '/logo2.2.png',
        dotsOptions: { color: '#000', type: 'square' },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 0,
          imageSize: 0.4
        },
        qrOptions: { errorCorrectionLevel: 'H' }
      });
    }
  }, []);

  const downloadQRWithLabel = async (qrUrl, label, fileName = 'qr-code') => {
    if (!qrInstanceRef.current) return false;
    qrInstanceRef.current.update({ data: qrUrl });

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      qrInstanceRef.current.append(tempDiv);
      // wait a little for the canvas to render
      await new Promise((resolve) => setTimeout(resolve, 400));
      const qrCanvas = tempDiv.querySelector('canvas');
      if (!qrCanvas) throw new Error('QR canvas not found');

      const width = qrCanvas.width;
      const height = label && label.length > 30 ? qrCanvas.height + 34 : qrCanvas.height + 24;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = height;
      const ctx = finalCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      ctx.drawImage(qrCanvas, 0, 0);

      if (label) {
        ctx.fillStyle = '#000000';
        ctx.font = label.length <= 24 ? '12px Arial' : '10px Arial';
        ctx.textAlign = 'center';
        const line1 = label.substring(0, 30);
        const line2 = label.substring(30);
        ctx.fillText(line1, width / 2, qrCanvas.height + 16);
        if (line2) ctx.fillText(line2, width / 2, qrCanvas.height + 30);
      }

      const sanitizedFileName = sanitizeFilename(fileName);
      const link = document.createElement('a');
      link.download = `${sanitizedFileName}.png`;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(tempDiv);
      return true;
    } catch (err) {
      console.error('Error downloading QR:', err);
      document.body.removeChild(tempDiv);
      return false;
    }
  };

  // ----------------- Drive recursion -----------------
  const fetchFolderContentsRecursively = async (folderId, accessTokenParam, maxDepth = 10, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return [];
    try {
      const children = await getFolderChildren(folderId, accessTokenParam);
      const processedChildren = [];
      for (const child of children) {
        const processedChild = {
          id: child.id,
          name: child.name,
          type: child.mimeType,
          link: child.mimeType === 'application/vnd.google-apps.folder'
            ? `https://drive.google.com/drive/folders/${child.id}`
            : `https://drive.google.com/file/d/${child.id}/view`,
          depth: currentDepth
        };

        if (child.mimeType === 'application/vnd.google-apps.folder') {
          try {
            processedChild.children = await fetchFolderContentsRecursively(child.id, accessTokenParam, maxDepth, currentDepth + 1);
            processedChild.hasChildren = processedChild.children.length > 0;
          } catch (nestedErr) {
            console.error(`Error fetching nested folder ${child.id}:`, nestedErr);
            processedChild.children = [];
            processedChild.hasChildren = false;
            processedChild.error = 'Failed to fetch nested contents';
          }
        }

        processedChildren.push(processedChild);
      }
      return processedChildren;
    } catch (err) {
      console.error(`Error fetching drive folder ${folderId}:`, err);
      throw err;
    }
  };
// eslint-disable-next-line
  const getFolderUrls = async (folderId, accessTokenParam) => {
    const urls = [];
    const fetchRecursive = async (id) => {
      try {
        const children = await getFolderChildren(id, accessTokenParam);
        for (const child of children) {
          if (child.mimeType === 'application/vnd.google-apps.folder') {
            await fetchRecursive(child.id);
          } else {
            urls.push({ fileName: child.name, url: `https://drive.google.com/file/d/${child.id}/view` });
          }
        }
      } catch (err) {
        console.error(`Error fetching folder ${id}:`, err);
      }
    };
    await fetchRecursive(folderId);
    return urls;
  };

  const countTotalItems = (items) => {
    let count = 0;
    for (const item of items) {
      count++;
      if (item.children && item.children.length > 0) count += countTotalItems(item.children);
    }
    return count;
  };

  // ----------------- Firestore flat recursion for 360_urls -----------------
  const get360FolderUrls = async (folderId) => {
    if (!folderId) return [];
    const urls = [];
    try {
      const q = query(firestoreCollection(db, '360_urls'), where('parentId', '==', folderId));
      const snapshot = await getDocs(q);
      if (!snapshot || snapshot.empty) return [];

      for (const docItem of snapshot.docs) {
        const data = docItem.data();
        if (data && data.isFolder) {
          const sub = await get360FolderUrls(docItem.id);
          if (sub && sub.length) urls.push(...sub);
        } else if (data && data.url) {
          urls.push({ fileName: data.fileName || '', url: data.url });
        }
      }
      return urls;
    } catch (err) {
      console.error(`get360FolderUrls error for ${folderId}:`, err);
      throw err;
    }
  };

  // ----------------- update folder contents (fetch + set state) -----------------
  const updateFolderContents = async () => {
    if (!qrData.isFolder || (!qrData.fileId && !qrData.folderId)) {
      setError('No folder ID found for updating contents.');
      return false;
    }

    // For Drive, we need accessToken. qr360 does not.
    if (qrCollection !== 'qr360' && !accessToken) {
      setError('No access token found. Please re-authenticate.');
      return false;
    }

    const folderIdValue = qrData.folderId || qrData.fileId;
    setIsUpdatingFolder(true);

    try {
      if (qrCollection === 'qr360') {
        // flat list from 360_urls
        if (!folderIdValue) {
          setError('No folderId available for qr360 refresh.');
          return false;
        }
        const flatList = await get360FolderUrls(folderIdValue);
        const safeList = Array.isArray(flatList) ? flatList : [];
        setQrData((prev) => ({
          ...prev,
          folderUrls: safeList,
          hasNestedStructure: false,
          totalItems: safeList.length
        }));
        return { folderUrls: safeList, totalItems: safeList.length, hasNestedStructure: false };
      } else {
        // Drive nested structure
        const nestedContents = await fetchFolderContentsRecursively(folderIdValue, accessToken, 5, 0);
        const totalItems = countTotalItems(nestedContents);
        setQrData((prev) => ({ ...prev, folderContents: nestedContents, totalItems, hasNestedStructure: true }));
        return { folderContents: nestedContents, totalItems, hasNestedStructure: true };
      }
    } catch (err) {
      console.error('Error in updateFolderContents:', err);
      setError('Failed to fetch updated folder contents.');
      return false;
    } finally {
      setIsUpdatingFolder(false);
    }
  };

  // ----------------- persist folder data to Firestore -----------------
  const persistFolderDataToFirestore = async (folderResult) => {
    if (!qrId || !qrCollection) {
      console.warn('No qrId/qrCollection to persist to Firestore');
      return false;
    }
    try {
      const payload = { updatedAt: new Date() };

      if (qrCollection === 'qr360') {
        payload.folderUrls = Array.isArray(folderResult?.folderUrls) ? folderResult.folderUrls : (qrData.folderUrls || []);
        payload.totalItems = typeof folderResult?.totalItems === 'number' ? folderResult.totalItems : (Array.isArray(payload.folderUrls) ? payload.folderUrls.length : 0);
        payload.hasNestedStructure = false;
      } else {
        payload.folderContents = Array.isArray(folderResult?.folderContents) ? folderResult.folderContents : (qrData.folderContents || []);
        payload.hasNestedStructure = !!folderResult?.hasNestedStructure || !!qrData.hasNestedStructure;
        payload.totalItems = typeof folderResult?.totalItems === 'number' ? folderResult.totalItems : (qrData.folderContents ? countTotalItems(qrData.folderContents) : 0);
      }

      // sanitize (remove undefined)
      const sanitized = {};
      for (const k of Object.keys(payload)) {
        if (payload[k] !== undefined) sanitized[k] = payload[k];
      }

      await updateDoc(doc(db, qrCollection, qrId), sanitized);
      return true;
    } catch (err) {
      console.error('Failed to persist folder data to Firestore:', err);
      setError('Failed to save refreshed folder data to Firestore. See console.');
      return false;
    }
  };

  // ----------------- fetch QR doc by link / id -----------------
  const fetchQRFromLink = async (link) => {
    try {
      setError('');
      setStatus('Fetching QR data...');
      const idMatch = link.match(/\/qr\/([^/?]+)/);
      const id = idMatch ? idMatch[1] : null;
      if (!id) throw new Error('Invalid QR link format. Expected .../qr/[id]');
      setQrId(id);

      const tryGetDoc = async (col) => {
        const snap = await getDoc(doc(db, col, id));
        return snap.exists() ? { data: snap.data(), col } : null;
      };

      let found = await tryGetDoc('qrCodes');
      if (!found) found = await tryGetDoc('qr360');
      if (!found) {
        setError('QR ID not found in database.');
        setStatus('');
        return;
      }

      setCollection(found.col);
      const data = found.data || {};
      const labelValue = data.label || '';
      setQrData({
        message: data.message || '',
        password: data.password || '',
        expiration: data.expiration?.seconds ? new Date(data.expiration.seconds * 1000) : data.expiration || null,
        label: labelValue,
        targetUrl: data.targetUrl || '',
        isFolder: data.isFolder || false,
        fileId: data.fileId || null,
        folderId: data.folderId || null,
        folderContents: data.folderContents || [],
        folderUrls: data.folderUrls || [],
        hasNestedStructure: data.hasNestedStructure || false,
        totalItems: data.totalItems || (Array.isArray(data.folderUrls) ? data.folderUrls.length : 0)
      });

      setOriginalLabel(labelValue);
      if (editorRef.current) editorRef.current.setContent(data.message || '');
      setStatus('QR data loaded successfully!');
    } catch (err) {
      console.error('Error fetching QR from link:', err);
      setError(err.message || 'Failed to fetch QR data from link.');
      setStatus('');
    }
  };

  // ----------------- scan image for QR -----------------
  const scanImage = async (file) => {
    const qrCode = new Html5Qrcode('edit-qr-canvas');
    try {
      const result = await qrCode.scanFile(file, true);
      const idMatch = result.match(/\/qr\/([^/]+)/);
      const id = idMatch ? idMatch[1] : null;
      if (!id) throw new Error('Invalid QR code');
      setQrId(id);

      const tryGetDoc = async (col) => {
        const snap = await getDoc(doc(db, col, id));
        return snap.exists() ? { data: snap.data(), col } : null;
      };

      let found = await tryGetDoc('qrCodes');
      if (!found) found = await tryGetDoc('qr360');
      if (!found) {
        setError('QR ID not found in Firestore.');
        return;
      }

      setCollection(found.col);
      const data = found.data || {};
      const labelValue = data.label || '';
      setQrData({
        message: data.message || '',
        password: data.password || '',
        expiration: data.expiration?.seconds ? new Date(data.expiration.seconds * 1000) : data.expiration || null,
        label: labelValue,
        targetUrl: data.targetUrl || '',
        isFolder: data.isFolder || false,
        fileId: data.fileId || null,
        folderId: data.folderId || null,
        folderContents: data.folderContents || [],
        folderUrls: data.folderUrls || [],
        hasNestedStructure: data.hasNestedStructure || false,
        totalItems: data.totalItems || (Array.isArray(data.folderUrls) ? data.folderUrls.length : 0)
      });

      setOriginalLabel(labelValue);
      if (editorRef.current) editorRef.current.setContent(data.message || '');
    } catch (err) {
      console.error('QR scan error:', err);
      setError('QR scan failed. Make sure it contains /qr/:id');
    } finally {
      qrCode.clear().catch(() => {});
    }
  };

  // ----------------- drag/drop & file select -----------------
  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Invalid image file.');
      return;
    }
    setQrImage(URL.createObjectURL(file));
    await scanImage(file);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Invalid image file.');
      return;
    }
    setQrImage(URL.createObjectURL(file));
    await scanImage(file);
  };
  const handleLinkSubmit = async () => {
    if (!qrLink.trim()) {
      setError('Please enter a QR link.');
      return;
    }
    await fetchQRFromLink(qrLink.trim());
  };

  // ----------------- main update handler (saves all fields) -----------------
  const handleUpdate = async () => {
    if (!qrId || !qrCollection) {
      setError('No valid QR ID or collection detected.');
      return;
    }

    try {
      const updatedMessage = editorRef.current?.getContent() || '';

      // Build update object (don't include undefined)
      const updateDataRaw = {
        message: updatedMessage,
        password: qrData.password !== undefined ? qrData.password : null,
        expiration: qrData.expiration || null,
        label: qrData.label !== undefined ? qrData.label : null,
        targetUrl: qrData.targetUrl !== undefined ? qrData.targetUrl : null,
        updatedAt: new Date()
      };

      // If it's a folder, include the current folder data (local state)
      if (qrData.isFolder) {
        if (qrCollection === 'qr360') {
          updateDataRaw.folderUrls = Array.isArray(qrData.folderUrls) ? qrData.folderUrls : [];
          updateDataRaw.totalItems = Array.isArray(qrData.folderUrls) ? qrData.folderUrls.length : 0;
          updateDataRaw.hasNestedStructure = false;
        } else {
          updateDataRaw.folderContents = Array.isArray(qrData.folderContents) ? qrData.folderContents : [];
          updateDataRaw.hasNestedStructure = !!qrData.hasNestedStructure;
          updateDataRaw.totalItems = qrData.folderContents ? countTotalItems(qrData.folderContents) : 0;
        }
      }

      // sanitize (remove undefined)
      const sanitizedUpdateData = {};
      for (const k of Object.keys(updateDataRaw)) {
        if (updateDataRaw[k] !== undefined) sanitizedUpdateData[k] = updateDataRaw[k];
      }

      // ensure expiration is Date or null
      if (sanitizedUpdateData.expiration && !(sanitizedUpdateData.expiration instanceof Date)) {
        try {
          sanitizedUpdateData.expiration = new Date(sanitizedUpdateData.expiration);
          if (isNaN(sanitizedUpdateData.expiration.getTime())) sanitizedUpdateData.expiration = null;
        } catch {
          sanitizedUpdateData.expiration = null;
        }
      }

      await updateDoc(doc(db, qrCollection, qrId), sanitizedUpdateData);

      // update local originalLabel so future label comparisons are correct
      setOriginalLabel(qrData.label);

      const labelChanged = qrData.label !== originalLabel;
      if (labelChanged) {
        const qrUrl = `${window.location.origin}/qr/${qrId}`;
        const fileName = (qrData.label && qrData.label.trim() ? qrData.label.trim() : 'updated') + '-qr';
        const downloadSuccess = await downloadQRWithLabel(qrUrl, qrData.label, fileName);
        if (downloadSuccess) setStatus('QR Updated and downloaded with new label');
        else setStatus('QR updated but download failed');
      } else {
        setStatus('QR updated successfully!');
      }
    } catch (err) {
      console.error('🔥 Firestore update error:', err);
      setError(err?.message ? `Failed to update QR: ${err.message}` : 'Failed to update QR in Firestore.');
    } finally {
      setIsUpdatingFolder(false);
    }
  };

  // ----------------- refresh folder and persist to Firestore -----------------
  const handleRefreshFolder = async () => {
    setStatus('');
    setError('');
    // Fetch latest folder contents (Drive or qr360)
    const updatedContents = await updateFolderContents();
    if (!updatedContents) {
      // updateFolderContents sets an error message already
      return;
    }

    // Persist the updated folder data to Firestore so the QR link points to latest data
    const persisted = await persistFolderDataToFirestore(updatedContents);
    if (persisted) {
      setStatus('Folder contents refreshed and saved to Firestore!');
    } else {
      // persistFolderDataToFirestore sets an error message
    }
  };

  // ----------------- misc UI helpers -----------------
  const clearMessage = () => {
    if (editorRef.current) editorRef.current.setContent('');
    setQrData((p) => ({ ...p, message: '' }));
  };
  const clearPassword = () => setQrData((p) => ({ ...p, password: '' }));
  const clearExpiration = () => setQrData((p) => ({ ...p, expiration: null }));
  const clearLabel = () => setQrData((p) => ({ ...p, label: '' }));
  const clearTargetUrl = () => setQrData((p) => ({ ...p, targetUrl: '' }));
  const clearLink = () => setQrLink('');

  const handleClear = () => {
    setQrImage(null);
    setQrId(null);
    setQrData({
      message: '',
      password: '',
      expiration: null,
      label: '',
      targetUrl: '',
      isFolder: false,
      fileId: null,
      folderId: null,
      folderContents: [],
      folderUrls: [],
      hasNestedStructure: false,
      totalItems: 0
    });
    setOriginalLabel('');
    setStatus('');
    setError('');
    setQrLink('');
    setInputMethod('image');
    if (editorRef.current) editorRef.current.setContent('');
  };

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) handleClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleClose]);

  useEffect(() => {
    if (status || error) {
      const timer = setTimeout(() => { setStatus(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, error]);

  // ----------------- render -----------------
  return (
    <div className="qr-info-modal-backdrop">
      <div className={`qr-info-modal custom-qr-modal ${closing ? 'fade-out' : ''}`} ref={modalRef}>
        <button className="close-btn" onClick={handleClose}>×</button>
        <h2>Update QR Code</h2>

        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#f0f0f0', borderRadius: '8px', paddingRight: '2px', paddingLeft: '7px' }}>
            <button onClick={() => setInputMethod('image')} style={{
              padding: '8px 16px', border: 'none', borderRadius: '6px',
              backgroundColor: inputMethod === 'image' ? '#007bff' : 'transparent',
              color: inputMethod === 'image' ? 'white' : '#333', cursor: 'pointer',
              fontSize: '14px', fontWeight: inputMethod === 'image' ? 'bold' : 'normal'
            }}>Upload Image</button>
            <button onClick={() => setInputMethod('link')} style={{
              padding: '8px 16px', border: 'none', borderRadius: '6px',
              backgroundColor: inputMethod === 'link' ? '#007bff' : 'transparent',
              color: inputMethod === 'link' ? 'white' : '#333', cursor: 'pointer',
              fontSize: '14px', fontWeight: inputMethod === 'link' ? 'bold' : 'normal'
            }}>Enter Link</button>
          </div>
        </div>

        {inputMethod === 'image' && !qrImage && (
          <div className="qr-dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
            <p>Drag and drop a QR code image here</p>
          </div>
        )}

        {inputMethod === 'link' && !qrId && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1px' }}>
              <label style={{ fontSize: '18px' }}>QR Link</label>
              <button type="button" onClick={clearLink} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input className="qr-input-url" type="text" value={qrLink} onChange={(e) => setQrLink(e.target.value)} placeholder="Enter QR link"
                style={{ flex: 1, height: '37px', marginBottom: '1px' }} onKeyPress={(e) => { if (e.key === 'Enter') handleLinkSubmit(); }} />
              <button onClick={handleLinkSubmit} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', height: '35px', whiteSpace: 'nowrap' }}>Fetch</button>
            </div>
          </div>
        )}

        {qrImage && (
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <img src={qrImage} alt="QR Preview" style={{ maxWidth: '180px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
          </div>
        )}

        {qrId && qrData.isFolder && (
          <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #bbdefb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1565c0' }}>📁 Folder QR Code</span>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {qrCollection === 'qr360' ? `Contains ${qrData.folderUrls?.length || 0} files` : `Contains ${qrData.totalItems || 0} items ${qrData.hasNestedStructure ? '(nested)' : ''}`}
                </div>
              </div>
              <button onClick={handleRefreshFolder} disabled={isUpdatingFolder} style={{
                padding: '6px 16px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px',
                cursor: isUpdatingFolder ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: isUpdatingFolder ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '100px', whiteSpace: 'nowrap', height: '32px'
              }}>
                {isUpdatingFolder ? (<div style={{ width: '12px', height: '12px', border: '2px solid transparent', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0, marginTop: '15px' }}></div>) : <>🔄 Refresh</>}
              </button>
            </div>
          </div>
        )}

        {qrId && (
          <div className="qr-form-fields">
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Target URL</label>
                <button type="button" onClick={clearTargetUrl} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
              </div>
              <input className="qr-input-url" type="url" value={qrData.targetUrl} onChange={(e) => setQrData(prev => ({ ...prev, targetUrl: e.target.value }))} placeholder="Enter target URL" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Note</label>
                <button type="button" onClick={clearMessage} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
              </div>
              <Editor tinymceScriptSrc={`${process.env.PUBLIC_URL}/tinymce/tinymce.min.js`} onInit={(evt, editor) => { editorRef.current = editor; }} initialValue={qrData.message} init={{ height: 200, menubar: false, plugins: 'link lists fullscreen', toolbar: 'undo redo | formatselect | bold italic underline HR | alignleft aligncenter alignright | bullist | fullscreen', branding: false }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Password</label>
                <button type="button" onClick={clearPassword} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
              </div>
              <input className="qr-input-url" type="text" value={qrData.password} onChange={(e) => setQrData(prev => ({ ...prev, password: e.target.value }))} placeholder="Enter password" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Expiration</label>
                <button type="button" onClick={clearExpiration} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
              </div>
              <DatePicker selected={qrData.expiration} onChange={(date) => setQrData(prev => ({ ...prev, expiration: date }))} showTimeSelect dateFormat="dd MMM yyyy, hh:mm aa" placeholderText="Select expiration date & time" className="qr-input-url" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <label style={{ margin: 0 }}>QR Label</label>
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>{(qrData.label || '').length}/58</span>
                </div>
                <button type="button" onClick={clearLabel} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
              </div>
              <textarea className="qr-input-url" value={qrData.label} onChange={(e) => { if (e.target.value.length <= 58) setQrData(prev => ({ ...prev, label: e.target.value })); }} placeholder="Enter QR label (appears below QR code)" maxLength={58} style={{ minHeight: '60px', resize: 'vertical' }} />
            </div>
          </div>
        )}

        <div className="upload-btn-group">
          {inputMethod === 'image' && <button className="upload-btn" onClick={() => fileInputRef.current.click()}>Upload QR Image</button>}
          {qrId && <button className="upload-btn" onClick={handleUpdate} style={{ backgroundColor: isUpdatingFolder ? '#aaa' : '#28a745', cursor: isUpdatingFolder ? 'not-allowed' : 'pointer', opacity: isUpdatingFolder ? 0.7 : 1 }} disabled={isUpdatingFolder}>Update</button>}
          <button className="upload-btn" onClick={handleClear} style={{ backgroundColor: '#ffc107', color: '#000' }}>Clear All</button>
          <button className="upload-btn" onClick={handleClose} style={{ backgroundColor: '#6c757d' }}>Close</button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
        <div id="edit-qr-canvas" style={{ display: 'none' }}></div>

        {error && <p className="error">{error}</p>}
        {status && <p className="success">{status}</p>}

        <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default EditQRModal;
