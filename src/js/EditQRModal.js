// EditQRModal.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Editor } from '@tinymce/tinymce-react';
import '../css/EditQRModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import QRCodeStyling from 'qr-code-styling';
import { getFolderChildren } from './utils.js'; // Import your existing utility

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
    hasNestedStructure: false
  });
  const [originalLabel, setOriginalLabel] = useState('');
  const [closing, setClosing] = useState(false);
  const [collection, setCollection] = useState('qrCodes');
  const [qrLink, setQrLink] = useState('');
  const [inputMethod, setInputMethod] = useState('image');
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false);

  const accessToken = localStorage.getItem('accessToken');
  const fileInputRef = useRef();
  const modalRef = useRef();
  const editorRef = useRef(null);
  const qrInstanceRef = useRef(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

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
      hasNestedStructure: false
    });
    setOriginalLabel('');
    setStatus('');
    setError('');
    setQrLink('');
    setInputMethod('image');
    if (editorRef.current) {
      editorRef.current.setContent('');
    }
  };

  // Individual clear functions for each field
  const clearMessage = () => {
    if (editorRef.current) {
      editorRef.current.setContent('');
    }
    setQrData(prev => ({ ...prev, message: '' }));
  };

  const clearPassword = () => {
    setQrData(prev => ({ ...prev, password: '' }));
  };

  const clearExpiration = () => {
    setQrData(prev => ({ ...prev, expiration: null }));
  };

  const clearLabel = () => {
    setQrData(prev => ({ ...prev, label: '' }));
  };

  const clearTargetUrl = () => {
    setQrData(prev => ({ ...prev, targetUrl: '' }));
  };

  const clearLink = () => {
    setQrLink('');
  };

  // Function to sanitize filename
  const sanitizeFilename = (filename) => {
    if (!filename || filename.trim() === '') {
      return 'qr-code';
    }
    return filename
      .trim()
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\.+$/g, '')
      .substring(0, 100);
  };

  // Initialize QRCodeStyling instance
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
          imageSize: 0.4,
        },
        qrOptions: { errorCorrectionLevel: 'H' },
      });
    }
  }, []);

  // Download QR code image with label below
  const downloadQRWithLabel = async (qrUrl, label, fileName = 'qr-code') => {
    if (!qrInstanceRef.current) return;

    qrInstanceRef.current.update({ data: qrUrl });

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      qrInstanceRef.current.append(tempDiv);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const qrCanvas = tempDiv.querySelector('canvas');
      if (!qrCanvas) {
        throw new Error('QR canvas not found');
      }

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
        if (line2) {
          ctx.fillText(line2, width / 2, qrCanvas.height + 30);
        }
      }
     
      const sanitizedFileName = sanitizeFilename(fileName);
      const link = document.createElement('a');
      link.download = `${sanitizedFileName}.png`;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();

      document.body.removeChild(tempDiv);
      return true;
    } catch (error) {
      console.error('Error downloading QR:', error);
      document.body.removeChild(tempDiv);
      return false;
    }
  };

  // NEW: Recursive function to fetch folder contents (adapted from QRgen)
  const fetchFolderContentsRecursively = async (folderId, accessToken, maxDepth = 10, currentDepth = 0) => {
    if (currentDepth >= maxDepth) {
      console.warn(`Max depth (${maxDepth}) reached for folder ${folderId}`);
      return [];
    }

    try {
      console.log(`📁 Fetching folder contents for ${folderId} at depth ${currentDepth}`);
      
      const children = await getFolderChildren(folderId, accessToken);
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
            processedChild.children = await fetchFolderContentsRecursively(
              child.id, 
              accessToken, 
              maxDepth, 
              currentDepth + 1
            );
            processedChild.hasChildren = processedChild.children.length > 0;
          } catch (nestedErr) {
            console.error(`❌ Error fetching nested folder ${child.id}:`, nestedErr);
            processedChild.children = [];
            processedChild.hasChildren = false;
            processedChild.error = 'Failed to fetch nested contents';
          }
        }
        
        processedChildren.push(processedChild);
      }
      
      return processedChildren;
      
    } catch (error) {
      console.error(`❌ Error fetching folder contents for ${folderId}:`, error);
      throw error;
    }
  };

  // NEW: Helper function for QR360Gen style flat folder URLs
  const getFolderUrls = async (folderId, accessToken) => {
    const urls = [];
    
    const fetchRecursive = async (id) => {
      try {
        const children = await getFolderChildren(id, accessToken);
        
        for (const child of children) {
          if (child.mimeType === 'application/vnd.google-apps.folder') {
            await fetchRecursive(child.id);
          } else {
            urls.push({
              fileName: child.name,
              url: `https://drive.google.com/file/d/${child.id}/view`
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching folder ${id}:`, err);
      }
    };
    
    await fetchRecursive(folderId);
    return urls;
  };

  // NEW: Count total items in nested structure
  const countTotalItems = (items) => {
    let count = 0;
    for (const item of items) {
      count++;
      if (item.children && item.children.length > 0) {
        count += countTotalItems(item.children);
      }
    }
    return count;
  };

  // NEW: Update folder contents
  const updateFolderContents = async () => {
    if (!qrData.isFolder || (!qrData.fileId && !qrData.folderId)) {
      setError('No folder ID found for updating contents.');
      return false;
    }

    if (!accessToken) {
      setError('No access token found. Please re-authenticate.');
      return false;
    }

    const folderId = qrData.fileId || qrData.folderId;
    setIsUpdatingFolder(true);

    try {
      console.log('📁 Updating folder contents for:', folderId);

      // Determine which collection and update method to use based on existing data structure
      if (collection === 'qr360') {
        // QR360Gen style - flat URL array
        const folderUrls = await getFolderUrls(folderId, accessToken);
        setQrData(prev => ({ ...prev, folderUrls }));
        return { folderUrls };
      } else {
        // QRgen style - nested structure
        const nestedContents = await fetchFolderContentsRecursively(folderId, accessToken, 5, 0);
        const totalItems = countTotalItems(nestedContents);
        
        setQrData(prev => ({ 
          ...prev, 
          folderContents: nestedContents,
          totalItems,
          hasNestedStructure: true
        }));
        
        return { 
          folderContents: nestedContents,
          totalItems,
          hasNestedStructure: true
        };
      }
    } catch (err) {
      console.error('❌ Error updating folder contents:', err);
      setError('Failed to fetch updated folder contents.');
      return false;
    } finally {
      setIsUpdatingFolder(false);
    }
  };

  // Function to fetch QR data from link
  const fetchQRFromLink = async (link) => {
    try {
      setError('');
      setStatus('Fetching QR data...');

      const idMatch = link.match(/\/qr\/([^/?]+)/);
      const id = idMatch ? idMatch[1] : null;
      
      if (!id) {
        throw new Error('Invalid QR link format. Expected format: .../qr/[id]');
      }

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

      const data = found.data;
      const labelValue = data.label || '';
      
      setQrData({
        message: data.message || '',
        password: data.password || '',
        expiration: data.expiration?.seconds
          ? new Date(data.expiration.seconds * 1000)
          : data.expiration || null,
        label: labelValue,
        targetUrl: data.targetUrl || '',
        isFolder: data.isFolder || false,
        fileId: data.fileId || null,
        folderId: data.folderId || null,
        folderContents: data.folderContents || [],
        folderUrls: data.folderUrls || [],
        hasNestedStructure: data.hasNestedStructure || false
      });

      setOriginalLabel(labelValue);

      if (editorRef.current) {
        editorRef.current.setContent(data.message || '');
      }

      setStatus('QR data loaded successfully!');
    } catch (err) {
      console.error('Error fetching QR from link:', err);
      setError(err.message || 'Failed to fetch QR data from link.');
      setStatus('');
    }
  };

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

      const data = found.data;
      const labelValue = data.label || '';
      
      setQrData({
        message: data.message || '',
        password: data.password || '',
        expiration: data.expiration?.seconds
          ? new Date(data.expiration.seconds * 1000)
          : data.expiration || null,
        label: labelValue,
        targetUrl: data.targetUrl || '',
        isFolder: data.isFolder || false,
        fileId: data.fileId || null,
        folderId: data.folderId || null,
        folderContents: data.folderContents || [],
        folderUrls: data.folderUrls || [],
        hasNestedStructure: data.hasNestedStructure || false
      });

      setOriginalLabel(labelValue);

      if (editorRef.current) {
        editorRef.current.setContent(data.message || '');
      }
    } catch (err) {
      console.error(err);
      setError('QR scan failed. Make sure it contains /qr/:id');
    }
  };

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

  const handleUpdate = async () => {
    if (!qrId || !collection) {
      setError('No valid QR ID or collection detected.');
      return;
    }

    try {
      const updatedMessage = editorRef.current?.getContent() || '';
      
      const updateData = {
        message: updatedMessage,
        password: qrData.password,
        expiration: qrData.expiration,
        label: qrData.label,
        targetUrl: qrData.targetUrl,
        updatedAt: new Date()
      };

      // NEW: If it's a folder, include updated folder contents
      if (qrData.isFolder) {
        if (collection === 'qr360') {
          updateData.folderUrls = qrData.folderUrls;
        } else {
          updateData.folderContents = qrData.folderContents;
          updateData.hasNestedStructure = qrData.hasNestedStructure;
          updateData.totalItems = qrData.folderContents ? countTotalItems(qrData.folderContents) : 0;
        }
      }

      await updateDoc(doc(db, collection, qrId), updateData);

      const labelChanged = qrData.label !== originalLabel;
      
      if (labelChanged) {
        const qrUrl = `${window.location.origin}/qr/${qrId}`;
        const fileName = (qrData.label.trim() || 'updated') + '-qr';
        const downloadSuccess = await downloadQRWithLabel(qrUrl, qrData.label, fileName);
        
        if (downloadSuccess) {
          setStatus('QR Updated and downloaded with new label');
        } else {
          setStatus('QR updated successfully, but download failed.');
        }
      } else {
        setStatus('QR updated successfully.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update QR in Firestore.');
    }
  };

  // NEW: Handle folder content refresh
  const handleRefreshFolder = async () => {
    const updatedContents = await updateFolderContents();
    if (updatedContents) {
      setStatus('Folder contents refreshed successfully!');
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleClose]);

  useEffect(() => {
    if (status || error) {
        const timer = setTimeout(() => {
        setStatus('');
        setError('');
        }, 5000);
        return () => clearTimeout(timer);
    }
    }, [status, error]);

  return (
    <div className="qr-info-modal-backdrop">
      <div
        className={`qr-info-modal custom-qr-modal ${closing ? 'fade-out' : ''}`}
        ref={modalRef}
      >
        <button className="close-btn" onClick={handleClose}>×</button>
        <h2>Update QR Code</h2>

        {/* Input method selector */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#f0f0f0', borderRadius: '8px', paddingRight: '2px', paddingLeft: '7px' }}>
            <button
              onClick={() => setInputMethod('image')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: inputMethod === 'image' ? '#007bff' : 'transparent',
                color: inputMethod === 'image' ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: inputMethod === 'image' ? 'bold' : 'normal'
              }}
            >
              Upload Image
            </button>
            <button
              onClick={() => setInputMethod('link')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: inputMethod === 'link' ? '#007bff' : 'transparent',
                color: inputMethod === 'link' ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: inputMethod === 'link' ? 'bold' : 'normal'
              }}
            >
              Enter Link
            </button>
          </div>
        </div>

        {/* Image upload section */}
        {inputMethod === 'image' && !qrImage && (
          <div className="qr-dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
            <p>Drag and drop a QR code image here</p>
          </div>
        )}

        {/* Link input section */}
        {inputMethod === 'link' && !qrId && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1px' }}>
              <label style={{ fontSize: '18px' }}>QR Link</label>
              <button 
                type="button"
                onClick={clearLink}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                alignItems: 'center'
              }}>
                <input
                  className="qr-input-url"
                  type="text"
                  value={qrLink}
                  onChange={(e) => setQrLink(e.target.value)}
                  placeholder="Enter QR link"
                  style={{ 
                    flex: 1,
                    height: '37px',
                    marginBottom: '1px'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLinkSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleLinkSubmit}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    height: '35px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Fetch
                </button>
              </div>
          </div>
        )}

        {/* Display QR image if uploaded */}
        {qrImage && (
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <img
              src={qrImage}
              alt="QR Preview"
              style={{
                maxWidth: '180px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            />
          </div>
        )}

        {/* NEW: Folder indicator and refresh button */}
        {qrId && qrData.isFolder && (
          <div style={{ 
            background: '#e3f2fd', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '1px solid #bbdefb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1565c0' }}>
                  📁 Folder QR Code
                </span>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {collection === 'qr360' 
                    ? `Contains ${qrData.folderUrls?.length || 0} files`
                    : `Contains ${qrData.totalItems || 0} items ${qrData.hasNestedStructure ? '(nested)' : ''}`
                  }
                </div>
              </div>
              <button
                onClick={handleRefreshFolder}
                disabled={isUpdatingFolder}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isUpdatingFolder ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: isUpdatingFolder ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  minWidth: '100px',
                  whiteSpace: 'nowrap'
                }}
              >
                {isUpdatingFolder ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      flexShrink: 0
                    }}></div>
                    Syncing...
                  </span>
                ) : (
                  <>🔄 Refresh</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Form fields - only show when QR data is loaded */}
        {qrId && (
          <div className="qr-form-fields">
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Target URL</label>
                <button 
                  type="button"
                  onClick={clearTargetUrl}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              <input
                className="qr-input-url"
                type="url"
                value={qrData.targetUrl}
                onChange={(e) => setQrData(prev => ({ ...prev, targetUrl: e.target.value }))}
                placeholder="Enter target URL"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Note</label>
                <button 
                  type="button"
                  onClick={clearMessage}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              <Editor
                tinymceScriptSrc={`${process.env.PUBLIC_URL}/tinymce/tinymce.min.js`}
                onInit={(evt, editor) => {
                  editorRef.current = editor;
                }}
                initialValue={qrData.message}
                init={{
                  height: 200,
                  menubar: false,
                  plugins: 'link lists fullscreen',
                  toolbar:
                    'undo redo | formatselect | bold italic underline HR | alignleft aligncenter alignright | bullist | fullscreen',
                  branding: false
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Password</label>
                <button 
                  type="button"
                  onClick={clearPassword}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              <input
                className="qr-input-url"
                type="text"
                value={qrData.password}
                onChange={(e) => setQrData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Expiration</label>
                <button 
                  type="button"
                  onClick={clearExpiration}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              <DatePicker
                selected={qrData.expiration}
                onChange={(date) => setQrData(prev => ({ ...prev, expiration: date }))}
                showTimeSelect
                dateFormat="dd MMM yyyy, hh:mm aa"
                placeholderText="Select expiration date & time"
                className="qr-input-url"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <label style={{ margin: 0 }}>QR Label</label>
                  <span style={{ 
                    marginLeft: '10px',
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    {qrData.label.length}/58
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={clearLabel}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              <textarea
                className="qr-input-url"
                value={qrData.label}
                onChange={(e) => {
                  if (e.target.value.length <= 58) {
                    setQrData(prev => ({ ...prev, label: e.target.value }));
                  }
                }}
                placeholder="Enter QR label (appears below QR code)"
                maxLength={58}
                style={{ 
                  minHeight: '60px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        <div className="upload-btn-group">
          {inputMethod === 'image' && (
            <button className="upload-btn" onClick={() => fileInputRef.current.click()}>
              Upload QR Image
            </button>
          )}
          {qrId && (
            <button 
              className="upload-btn" 
              onClick={handleUpdate} 
              style={{ 
                backgroundColor: isUpdatingFolder ? '#aaa' : '#28a745',
                cursor: isUpdatingFolder ? 'not-allowed' : 'pointer',
                opacity: isUpdatingFolder ? 0.7 : 1
              }}
              disabled={isUpdatingFolder}
            >
              Update
            </button>
          )}
          <button className="upload-btn" onClick={handleClear} style={{ backgroundColor: '#ffc107', color: '#000' }}>
            Clear All
          </button>
          <button className="upload-btn" onClick={handleClose} style={{ backgroundColor: '#6c757d' }}>
            Close
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <div id="edit-qr-canvas" style={{ display: 'none' }}></div>

        {error && <p className="error">{error}</p>}
        {status && <p className="success">{status}</p>}

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default EditQRModal;