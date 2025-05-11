import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import SearchFilter from './SearchFilter';
import './App.css';
import QRgen from './QRgen';
import BottomNavBar from './BottomNavBar';
import CustomQR from './CustomQR';



const AppContent = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderStack, setFolderStack] = useState([]);
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fileType, setFileType] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [sortOption, setSortOption] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [customLink, setCustomLink] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


const login = useGoogleLogin({
  onSuccess: (tokenResponse) => {
    setAccessToken(tokenResponse.access_token);
    setShowLoginMessage(true);
    if (stayLoggedIn) {
      localStorage.setItem('accessToken', tokenResponse.access_token);
      localStorage.setItem('stayLoggedIn', 'true');
    }
  },
  onError: () => alert('Login Failed'),
  scope: 'https://www.googleapis.com/auth/drive profile email',
  flow: 'implicit',
  redirectUri: 'https://secure-dwg.vercel.app/oauth2/callback', // Make sure this is correct
});


  const fetchDriveFiles = useCallback(async (folderId) => {
    if (!folderId || !accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
  `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,parents,size,modifiedTime,createdTime)`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  }
);

      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setError('Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await res.json();
      setUserInfo(userData);
      if (stayLoggedIn) {
        localStorage.setItem('userInfo', JSON.stringify(userData));
      }
    } catch {
      setError('Failed to fetch user info.');
    }
  }, [accessToken, stayLoggedIn]);

  const handleDelete = async (fileId, fileName) => {
  const confirmation = window.prompt(`Type DELETE to confirm deletion of "${fileName}":`);
  if (confirmation !== 'DELETE') {
    alert('Deletion cancelled.');
    return;
  }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      alert(`"${fileName}" deleted successfully.`);
      fetchDriveFiles(currentFolderId); // Refresh the list
    } else {
      alert('Failed to delete the file.');
    }
  } catch (err) {
    alert('Error deleting file.');
  }
};



  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUserInfo = localStorage.getItem('userInfo');
    const savedStayLoggedIn = localStorage.getItem('stayLoggedIn') === 'true';
    if (savedToken && savedUserInfo && savedStayLoggedIn) {
      setAccessToken(savedToken);
      setUserInfo(JSON.parse(savedUserInfo));
      setStayLoggedIn(true);
    }
  }, []);

  useEffect(() => {
  const savedFolderId = localStorage.getItem('currentFolderId');
  const savedStack = localStorage.getItem('folderStack');
  if (savedFolderId) setCurrentFolderId(savedFolderId); // Only if exists
  if (savedStack) setFolderStack(JSON.parse(savedStack));
}, []);


  useEffect(() => {
    if (accessToken && currentFolderId) {
      fetchDriveFiles(currentFolderId);
      fetchUserInfo();
      const timer = setTimeout(() => setShowLoginMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [accessToken, currentFolderId, fetchDriveFiles, fetchUserInfo]);

  useEffect(() => {
    if (stayLoggedIn) {
      localStorage.setItem('currentFolderId', currentFolderId);
      localStorage.setItem('folderStack', JSON.stringify(folderStack));
    }
  }, [currentFolderId, folderStack, stayLoggedIn]);

  const handleFolderClick = (folder) => {
    const newStack = [...folderStack, { id: currentFolderId, name: folder.name }];
    setFolderStack(newStack);
    setCurrentFolderId(folder.id);
  };

  const handleBack = () => {
  if (folderStack.length > 0) {
    const prevFolder = folderStack[folderStack.length - 1];
    setFolderStack(folderStack.slice(0, -1));
    setCurrentFolderId(prevFolder.id);
    setFileType('all'); // Reset filter to 'all'
   }

   
  };
const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [currentFolderId],
        }),
      });
      if (res.ok) {
        fetchDriveFiles(currentFolderId);
      } else {
        alert('Failed to create folder.');
      }
    } catch {
      alert('Error creating folder.');
    }
  };

  const fileInputRef = React.useRef();

  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
  const filesToUpload = e.target.files;
  if (!filesToUpload || filesToUpload.length === 0) return;

  const getUniqueName = (originalName) => {
    const nameParts = originalName.split('.');
    const extension = nameParts.length > 1 ? '.' + nameParts.pop() : '';
    const baseName = nameParts.join('.');
    let counter = 1;
    let uniqueName = originalName;

    const currentNames = files.map(f => f.name);

    while (currentNames.includes(uniqueName)) {
      uniqueName = `${baseName} (${counter})${extension}`;
      counter++;
    }
    return uniqueName;
  };

  for (const file of filesToUpload) {
    const uniqueName = getUniqueName(file.name);
    const metadata = {
      name: uniqueName,
      parents: [currentFolderId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );
      if (!res.ok) alert(`Upload failed: ${file.name}`);
    } catch {
      alert(`Error uploading file: ${file.name}`);
    }
  }

  fetchDriveFiles(currentFolderId);
};


  const handleDragOver = (e) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDragLeave = (e) => {
  e.preventDefault();
  setIsDragging(false);
};

const handleDrop = (e) => {
  e.preventDefault();
  setIsDragging(false);

  const droppedFiles = e.dataTransfer.files;
  if (droppedFiles && droppedFiles.length > 0) {
    const syntheticEvent = { target: { files: droppedFiles } };
    handleFileUpload(syntheticEvent);
  }
};


const handleLogout = () => {
  const confirmed = window.confirm('Press OK to Logout\nPress Cancel to Stay Signed In');

  if (!confirmed) return;

  setAccessToken(null);
  setUserInfo(null);
  setFiles([]);
  setFolderStack([]);
  setCurrentFolderId('root');
  setStayLoggedIn(false);

  localStorage.clear();
  alert('Logged out!');
};


  const getFileIcon = (mimeType) => {
    if (mimeType === 'application/pdf') return '📕';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎧';
    if (mimeType === 'application/msword') return '📝';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '📄📝';
    if (mimeType === 'application/vnd.ms-excel') return '📊';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '📊';
    if (mimeType === 'application/vnd.ms-powerpoint') return '📽️';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return '📽️';
    if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') return '🗜️';
    if (mimeType === 'text/plain') return '📄';
    if (mimeType.includes('cad')) return '📐';
    if (mimeType === 'application/vnd.google-apps.folder') return '📁';
    return '📄';
  };

  const filtered = files.filter(file => {
    const nameMatch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch =
      fileType === 'all' ||
      (fileType === 'application/vnd.google-apps.folder' && file.mimeType === 'application/vnd.google-apps.folder') ||
      (fileType === 'image' && file.mimeType.startsWith('image/')) ||
      (fileType === 'video' && file.mimeType.startsWith('video/')) ||
      (fileType === 'audio' && file.mimeType.startsWith('audio/')) ||
      (fileType === 'application/pdf' && file.mimeType === 'application/pdf') ||
      (fileType === 'application/msword' && file.mimeType === 'application/msword') ||
      (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
      (fileType === 'application/vnd.ms-excel' && file.mimeType === 'application/vnd.ms-excel') ||
      (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
      (fileType === 'application/vnd.ms-powerpoint' && file.mimeType === 'application/vnd.ms-powerpoint') ||
      (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' && file.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') ||
      (fileType === 'zip' && ['application/zip', 'application/x-zip-compressed', 'application/x-zip', 'multipart/x-zip'].includes(file.mimeType)) ||
      (fileType === 'text/plain' && file.mimeType === 'text/plain') ||
      (fileType === 'cad' && file.mimeType.toLowerCase().includes('cad'));

    return nameMatch && typeMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
  if (!sortOption) return 0;
  const { key, direction } = sortOption;

  let aValue = a.name.toLowerCase();
  let bValue = b.name.toLowerCase();

  if (key === 'size') {
    aValue = a.size || 0;
    bValue = b.size || 0;
  } else if (key === 'date') {
    aValue = new Date(a.modifiedTime || a.createdTime || 0);
    bValue = new Date(b.modifiedTime || b.createdTime || 0);
  }

  if (aValue < bValue) return direction === 'asc' ? -1 : 1;
  if (aValue > bValue) return direction === 'asc' ? 1 : -1;
  return 0;
});

   return (
    <main className="app-container">
      <h1>SecureDWG</h1>

      {!accessToken ? (
        <>
          <label>
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
            /> Stay Logged In
          </label>
          <button className="primary-button" onClick={login}>Login with Google</button>
        </>
      ) : (
        <>
          {showLoginMessage && <h3>You are logged in!</h3>}

          {userInfo && (
                <p>
                  Welcome, <strong>{userInfo.name}</strong> ({userInfo.email}) <button onClick={handleLogout}>Logout</button>
                </p>
              )}



              {/* ✅ Toolbar first */}
              <div className="toolbar">
                <button onClick={handleCreateFolder}>➕ New Folder</button>
                <button onClick={handleFileUploadClick}>📤 Upload File</button>
                <button onClick={() => setShowLinkModal(true)}>🔗 Add Link</button>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
              </div>


              {/* 🔻 Then search/filter */}
              <SearchFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                fileType={fileType}
                setFileType={setFileType}
                sortOption={sortOption}
                setSortOption={setSortOption}
              />



          {folderStack.length > 0 && !isMobile && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={handleBack}>← Back</button>
              <button onClick={() => fetchDriveFiles(currentFolderId)}>⟲ Refresh</button>
            </div>
          )}


          <div
  className={`drop-zone ${isDragging ? 'dragging' : ''}`}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  {isDragging ? (
  <div className="drag-overlay">
    <div className="drag-message">
      <div className="drag-icon">📤</div>
      <div className="drag-text">Drop here to Upload</div>
    </div>
  </div>
) : (
  <>
    <p>Path: My Drive{folderStack.map(folder => ` / ${folder.name}`)}</p>

    {loading ? (
      <p>Loading files...</p>
    ) : error ? (
      <p>{error}</p>
    ) : filtered.length === 0 ? (
      <p>No files match your filters.</p>
    ) : (
      <div className="file-container">
        <ul className="file-list">
          {sorted.map(file => (
            <li key={file.id}>
              <div className="file-item">
                <a
  href={file.mimeType === 'application/vnd.google-apps.folder'
    ? undefined
    : `https://drive.google.com/file/d/${file.id}/view`}
  target={file.mimeType === 'application/vnd.google-apps.folder' ? undefined : "_blank"}
  rel="noreferrer"
  onClick={() => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      handleFolderClick(file);
    }
  }}
  className="file-link"
  title={file.name} // full name on hover
>
  <span className="file-icon">{getFileIcon(file.mimeType)}</span>
  <span className="file-name">{file.name}</span>
</a>



                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <QRgen
                    fileId={file.id}
                    fileName={file.name}
                    isFolder={file.mimeType === 'application/vnd.google-apps.folder'}
                  />
                  <button onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id, file.name);
                  }}>🗑️</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
  </>
)}




</div>           
        </>
        
      )}
     
      {/* ✅ Add the BottomNavBar only on mobile */}
{isMobile && folderStack.length > 0 && (
  <BottomNavBar 
    onBack={handleBack} 
    scrollToTop={scrollToTop} 
  />
)}

{!isMobile && folderStack.length > 0 && (
  <button className="scroll-to-top" onClick={scrollToTop} title="top">Back To Top</button>
)}

{/* Always visible Back to Top Button */}
{isMobile && folderStack.length === 0 && (
  <div className="bottom-nav">
    <button onClick={scrollToTop}>↑</button>
  </div>
)}



      {showLinkModal && (
  <CustomQR
    customLink={customLink}
    setCustomLink={setCustomLink}
    onClose={() => setShowLinkModal(false)}
  />
)}


    </main>
    
  );
};


const App = () => (
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
    <AppContent />
  </GoogleOAuthProvider>
);



export default App;