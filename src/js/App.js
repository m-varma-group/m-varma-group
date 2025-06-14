// React hooks, CSS styles, and component imports
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRLandingPage from './QRLandingPage';
import '../css/App.css';
import '../css/UploadModal.css';

// Custom component imports
import BottomNavBar from './BottomNavBar';
import CustomQR from './CustomQR';
import SearchFilter, { applyFiltersAndSort } from './SearchFilter';
import Toolbar from './Toolbar';
import DriveDropZone from './DriveDropZone';
import { useGoogleDriveLogin } from './GoogleLogin';
import UploadProgressModal from './UploadProgressModal';
import PermissionsModal from './PermissionsModal';
import TokenExpiredModal from './TokenExpiredModal';



// API and localStorage logic
import {
  fetchDriveFiles,
  fetchUserInfo,
  createFolder,
  uploadFiles,
  deleteFile
} from './DriveAPI';
import { saveToLocal, getFromLocal, clearLocalStorage } from './AccLocalStore';

// Defines the core logic and UI for your app using stateful hooks.
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
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadTasks, setUploadTasks] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);


  const fileInputRef = useRef();

  // Initializes login flow and handles what happens when the user logs in successfully.
  const { login } = useGoogleDriveLogin({
    stayLoggedIn,
    onSuccessCallback: (tokenResponse) => {
      const now = Date.now();
      setAccessToken(tokenResponse.access_token);
      saveToLocal.accessToken(tokenResponse.access_token);
      saveToLocal.loginTime(now);
      setShowLoginMessage(true);
    },
  });

  // Fetches drive files and user info when the folder or session changes.
  const loadFiles = useCallback(async (folderId) => {
    if (!folderId || !accessToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchDriveFiles(folderId, accessToken);
      setFiles(result);
    } catch {
      setError('Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadUser = useCallback(async () => {
    try {
      const user = await fetchUserInfo(accessToken);
      setUserInfo(user);
      if (stayLoggedIn) {
        saveToLocal.userInfo(user);
      }
    } catch {
      setError('Failed to fetch user info.');
    }
  }, [accessToken, stayLoggedIn]);


  // Prompts the user to enter a folder name and creates it on Drive.
  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    try {
      await createFolder(folderName, currentFolderId, accessToken);
      loadFiles(currentFolderId);
    } catch {
      alert('Failed to create folder.');
    }
  };
   
  // Handles uploading multiple files with per-file progress and completion tracking.
  const handleFileUpload = async (e) => {
    const filesToUpload = e.target.files;
    if (!filesToUpload?.length) return;

    setUploadProgress({});
    setUploadTasks({});
    setShowUploadModal(true);
    setUploadDone(false);

    const uploadControllers = {};
    const totalFiles = filesToUpload.length;
    let completedFiles = 0;

    const onSingleFileProgress = (fileName, percent) => {
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: percent
      }));
    };

    const onSingleFileComplete = () => {
      completedFiles++;
      if (completedFiles === totalFiles) {
        setUploadDone(true);
      }
    };

    try {
      for (const file of filesToUpload) {
        const controller = new AbortController();
        uploadControllers[file.name] = controller;

        await uploadFiles(
          [file],
          files,
          currentFolderId,
          accessToken,
          (fileName, percent) => {
            onSingleFileProgress(fileName, percent);
          },
          controller.signal
        );
        onSingleFileComplete();
      }
      loadFiles(currentFolderId);
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('An error occurred during upload.');
      }
    }
    setUploadTasks(uploadControllers);
  };

  // Cancels an individual file upload or closes the upload progress modal.
  const handleCancelUpload = (fileName) => {
    const controller = uploadTasks[fileName];
    if (controller) controller.abort();
    setUploadProgress(prev => {
      const copy = { ...prev };
      delete copy[fileName];
      return copy;
    });
    setUploadTasks(prev => {
      const copy = { ...prev };
      delete copy[fileName];
      return copy;
    });
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadProgress({});
    setUploadTasks({});
    setUploadDone(false);
  };

  // Asks for confirmation before deleting a file or folder from Google Drive.
  const handleDelete = async (fileId, fileName) => {
    const confirmation = window.prompt(`Type DELETE to confirm deletion of "${fileName}":`);

    // Check if the user cancelled the prompt
    if (!confirmation || confirmation.toLowerCase() !== 'delete') {
      alert('Deletion cancelled.');
      return;
    }

    try {
      await deleteFile(fileId, accessToken);
      alert(`"${fileName}" deleted successfully.`);
      loadFiles(currentFolderId);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file.');
    }
  };


  // Navigates into subfolders or back to parent folders using a stack-based approach.
  const handleFolderClick = (folder) => {
    const newStack = [...folderStack, { id: currentFolderId, name: folder.name }];
    setFolderStack(newStack);
    setCurrentFolderId(folder.id);
  };

  const handleBack = () => {
    if (folderStack.length > 0) {
      const prev = folderStack[folderStack.length - 1];
      setFolderStack(folderStack.slice(0, -1));
      setCurrentFolderId(prev.id);
      setFileType('all');
    }
  };
  // Smooth scroll and user logout/reset functionality.
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleLogout = () => {
    if (!window.confirm('Press OK to Logout\nPress Cancel to Stay Signed In')) return;
    setAccessToken(null);
    setUserInfo(null);
    setFiles([]);
    setFolderStack([]);
    setCurrentFolderId('root');
    setStayLoggedIn(false);
    clearLocalStorage();
    alert('Logged out!');
  };

  // Enables file drag-and-drop uploads.
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
    if (droppedFiles?.length > 0) {
      const syntheticEvent = { target: { files: droppedFiles } };
      handleFileUpload(syntheticEvent);
    }
  };

  // Handles startup logic, session restoration, auto-refresh, and screen responsiveness.
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const token = getFromLocal.accessToken();
    const user = getFromLocal.userInfo();
    const stay = getFromLocal.stayLoggedIn();

    if (token && user && stay) {
      setAccessToken(token);
      setUserInfo(user);
      setStayLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const savedFolderId = getFromLocal.currentFolderId();
    const savedStack = getFromLocal.folderStack();
    if (savedFolderId) setCurrentFolderId(savedFolderId);
    if (savedStack) setFolderStack(savedStack);
  }, []);

  useEffect(() => {
    if (accessToken && currentFolderId) {
      loadFiles(currentFolderId);
      loadUser();
      const timer = setTimeout(() => setShowLoginMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [accessToken, currentFolderId, loadFiles, loadUser]);

  useEffect(() => {
    if (stayLoggedIn) {
      saveToLocal.currentFolderId(currentFolderId);
      saveToLocal.folderStack(folderStack);
      saveToLocal.stayLoggedIn(true);
    }
  }, [currentFolderId, folderStack, stayLoggedIn]);

  useEffect(() => {
    if (!stayLoggedIn || !accessToken) return;

    const loginTime = getFromLocal.loginTime();
    const now = Date.now();
    const elapsed = now - loginTime;
    const maxSession = 55 * 60 * 1000;

    if (elapsed > maxSession) {
      console.log('Access token expired.');
      setShowTokenExpiredModal(true); // Show modal instead of logging in directly
    } else {
      const timeout = setTimeout(() => {
        console.log('Auto-relogin triggered.');
        setShowTokenExpiredModal(true); // Show modal before re-login
      }, maxSession - elapsed);

      return () => clearTimeout(timeout);
    }
  }, [stayLoggedIn, accessToken]);


  // Applies search, type filters, and sorting to the displayed files.
  const sorted = applyFiltersAndSort(files, searchTerm, fileType, sortOption);
  
  // Renders login screen or full Drive interface depending on user’s login state.
  return (
    <main className="app-container">
      {!accessToken ? (
        <div className="login-screen">
          <div className="login-container">
            <h1 className="main-title">M Varma Group</h1>
            <label>
              <input
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
              /> Stay Logged In
            </label>
            <button className="primary-button" onClick={login}>Login with Google</button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="main-title">M Varma Group</h1>
          {showLoginMessage && <h3>You are logged in!</h3>}
          {userInfo && (
            <p>
              Welcome, <strong>{userInfo.name}</strong> ({userInfo.email}){' '}
              <button className="logout-button" onClick={handleLogout}>Logout</button>
            </p>
          )}

          <Toolbar
            isMobile={isMobile}
            handleCreateFolder={handleCreateFolder}
            handleFileUploadClick={() => fileInputRef.current.click()}
            setShowLinkModal={setShowLinkModal}
            fetchDriveFiles={loadFiles}
            currentFolderId={currentFolderId}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
          />

          <SearchFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            fileType={fileType}
            setFileType={setFileType}
            sortOption={sortOption}
            setSortOption={setSortOption}
          />

          {!isMobile && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {folderStack.length > 0 && (
                <button onClick={handleBack}>← Back</button>
              )}
              <button onClick={() => loadFiles(currentFolderId)}>⟲ Refresh</button>
            </div>
          )}


          <DriveDropZone
            isDragging={isDragging}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            folderStack={folderStack}
            loading={loading}
            error={error}
            sorted={sorted}
            handleFolderClick={handleFolderClick}
            currentFolderId={currentFolderId}
            fetchDriveFiles={loadFiles}
            handleDelete={handleDelete}
            isMobile={isMobile}
            scrollToTop={scrollToTop}
            setShowPermissions={setShowPermissions}
            setSelectedFileId={setSelectedFileId}
            setSelectedFileName={setSelectedFileName}
          />
        </>
      )}

      {isMobile && folderStack.length > 0 && (
        <BottomNavBar onBack={handleBack} scrollToTop={scrollToTop} />
      )}

      {showLinkModal && (
        <CustomQR
          customLink={customLink}
          setCustomLink={setCustomLink}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {showUploadModal && (
        <UploadProgressModal
          uploadProgress={uploadProgress}
          onCancel={handleCancelUpload}
          onClose={handleCloseUploadModal}
          uploadDone={uploadDone}
        />
      )}

      {showPermissions && (
        <PermissionsModal
          fileId={selectedFileId}
          accessToken={localStorage.getItem('accessToken')}
          fileName={selectedFileName}
          onClose={() => setShowPermissions(false)}
        />
      )}

      {showTokenExpiredModal && (
        <TokenExpiredModal
          onLogin={() => {
            setShowTokenExpiredModal(false);
            login(); // Re-authenticate
          }}
          onLogout={() => {
            setShowTokenExpiredModal(false);
            handleLogout(); // Log out
          }}
        />
      )}



    </main>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Fullscreen public route */}
      <Route path="/qr/:id" element={<QRLandingPage />} />
      
      {/* Everything else needs login */}
      <Route path="*" element={<AppContent />} />
    </Routes>
  );
};

// Wraps your app with Google’s OAuth context using your client ID.
const App = () => (
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
    <Router>
      <AppRoutes />
    </Router>
  </GoogleOAuthProvider>
);

export default App;
