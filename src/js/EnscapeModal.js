import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import QR360Gen from './QR360Gen';
import Move360Modal from './Move360Modal';
import '../css/EnscapeModal.css';

const EnscapeModal = ({ onClose }) => {
  const [closing, setClosing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState([]);
  const [path, setPath] = useState([{ name: 'root', id: null }]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState(null);
  const currentFolderId = path[path.length - 1].id;

  useEffect(() => {
    const q = currentFolderId
      ? query(collection(db, '360_urls'), where('parentId', '==', currentFolderId))
      : query(collection(db, '360_urls'), where('parentId', '==', null));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItems(list);
    });
    return () => unsubscribe();
  }, [currentFolderId]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const formatUrl = (rawUrl) => {
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  const handleAdd = async () => {
    if (!fileName || !url) {
      alert('Please enter both file name and URL');
      return;
    }

    const trimmedUrl = url.trim();
    const formattedUrl = formatUrl(trimmedUrl);
    const trimmedFileName = fileName.trim();

    // Check for duplicate URL in current folder
    const urlQuery = currentFolderId
      ? query(
          collection(db, '360_urls'),
          where('parentId', '==', currentFolderId),
          where('url', '==', formattedUrl)
        )
      : query(
          collection(db, '360_urls'),
          where('parentId', '==', null),
          where('url', '==', formattedUrl)
        );

    const urlSnapshot = await getDocs(urlQuery);

    if (!urlSnapshot.empty) {
      const existingDoc = urlSnapshot.docs[0].data();
      alert(`URL already exists by the name: ${existingDoc.fileName}`);
      return;
    }

    // Check for duplicate file name in current folder
    const nameExists = items.some(
      (item) => item.fileName.trim().toLowerCase() === trimmedFileName.toLowerCase()
    );

    if (nameExists) {
      alert('A file or folder with this name already exists in the current folder.');
      return;
    }

    await addDoc(collection(db, '360_urls'), {
      fileName: trimmedFileName,
      url: formattedUrl,
      isFolder: false,
      parentId: currentFolderId || null,
    });

    setFileName('');
    setUrl('');
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const trimmedFolderName = folderName.trim();

    const nameExists = items.some(
      (item) => item.fileName.trim().toLowerCase() === trimmedFolderName.toLowerCase()
    );

    if (nameExists) {
      alert('A file or folder with this name already exists in the current folder.');
      return;
    }

    try {
      await addDoc(collection(db, '360_urls'), {
        fileName: trimmedFolderName,
        isFolder: true,
        url: '',
        parentId: currentFolderId || null,
      });
    } catch (error) {
      alert('Failed to create folder.');
    }
  };

  const deleteFolderRecursively = async (folderId) => {
    const q = query(collection(db, '360_urls'), where('parentId', '==', folderId));
    const snapshot = await getDocs(q);
    for (const docItem of snapshot.docs) {
      const data = docItem.data();
      if (data.isFolder) {
        await deleteFolderRecursively(docItem.id);
      } else {
        await deleteDoc(doc(db, '360_urls', docItem.id));
      }
    }
    await deleteDoc(doc(db, '360_urls', folderId));
  };

  const handleDelete = async (id, fileName) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const confirmation = window.prompt(
      `Type DELETE to confirm deletion of "${fileName}":`
    );

    if (!confirmation || confirmation.toLowerCase() !== 'delete') {
      alert('Deletion cancelled.');
      return;
    }

    try {
      if (item.isFolder) {
        await deleteFolderRecursively(id);
      } else {
        await deleteDoc(doc(db, '360_urls', id));
      }
      alert(`"${fileName}" deleted successfully.`);
    } catch (err) {
      alert('Failed to delete item.');
    }
  };

  const handleUpdateName = async (id, newName) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return;

    const nameExists = items.some(
      (item) =>
        item.id !== id &&
        item.fileName.trim().toLowerCase() === trimmedNewName.toLowerCase()
    );

    if (nameExists) {
      alert('Another item with this name already exists.');
      return;
    }

    await updateDoc(doc(db, '360_urls', id), { fileName: trimmedNewName });
  };

  const handleOpenFolder = (folder) => {
    setPath((prev) => [...prev, { name: folder.fileName, id: folder.id }]);
  };

  const handleNavigatePath = (index) => {
    setPath((prev) => prev.slice(0, index + 1));
  };

  // Move functionality handlers
  const handleMoveItem = (item) => {
    setItemToMove(item);
    setShowMoveModal(true);
  };

  const handleCloseMoveModal = () => {
    setShowMoveModal(false);
    setItemToMove(null);
  };

  const handleMoveComplete = () => {
    setShowMoveModal(false);
    setItemToMove(null);
  };

  return (
    <div
      className={`enscape-modal-overlay ${closing ? 'fade-out' : 'fade-in'}`}
      onClick={handleClose}
    >
      <div
        className={`enscape-modal-main ${closing ? 'fade-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="enscape-close-button" onClick={handleClose} style={{backgroundColor: '#6c757d'}}>
          Close
        </button>

        <div className="enscape-modal-header">
          <h2>Enscape 360 Manager</h2>
        </div>

        <div className="enscape-modal-inputs">
          <input
            type="text"
            placeholder="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="enscape-input-file-name"
          />
          <input
            type="text"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="enscape-input-url"
          />
          <button onClick={handleAdd} className="enscape-add-button expanded">
            Add Link
          </button>
          <button onClick={handleCreateFolder} className="enscape-add-button expanded">
            New Folder
          </button>
        </div>

        <div className="enscape-path">
          {path.length > 1 && (
            <button
              className="enscape-back-button"
              onClick={() => handleNavigatePath(path.length - 2)}
            >
              ← Back
            </button>
          )}
          <strong style={{ marginLeft: path.length > 1 ? '12px' : '0' }}>Path:</strong>{' '}
          {path.map((p, index) => (
            <span
              key={p.id || 'root'}
              onClick={() => handleNavigatePath(index)}
              className="enscape-path-link"
            >
              {p.name}
              {index < path.length - 1 && ' / '}
            </span>
          ))}
        </div>

        <div className="enscape-modal-file-list">
          {items.map((item) => (
            <div key={item.id} className="enscape-file-item">
              <div className="enscape-file-info">
                {item.isFolder ? (
                  <span
                    onClick={() => handleOpenFolder(item)}
                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    <span style={{ marginRight: '10px' }}>📁</span>{item.fileName}
                  </span>
                ) : (
                  <span
                    onClick={() => window.open(item.url, '_blank')}
                    style={{ cursor: 'pointer', color: 'black', textDecoration: 'none' }}
                  >
                    <span style={{ marginRight: '10px' }}>🔗</span>{item.fileName}
                  </span>
                )}
              </div>
              <div className="enscape-file-actions">
                {!item.isFolder && (
                <QR360Gen url={item.url} fileName={item.fileName} />
                )}
                {!item.isFolder && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(item.url);
                        alert('Link copied to clipboard!');
                      } catch (err) {
                        alert('Failed to copy link.');
                      }
                    }}
                    title="Copy URL"
                    className="enscape-copy-button"
                  >
                    📋
                  </button>
                )}
                <button
                  onClick={() => handleMoveItem(item)}
                  title="Move"
                  className="enscape-copy-button"
                >
                  ↔️
                </button>
                <button
                  onClick={() => {
                    const newName = prompt('Enter new name:', item.fileName);
                    if (newName && newName.trim() && newName !== item.fileName) {
                      handleUpdateName(item.id, newName);
                    }
                  }}
                  title="Rename"
                  className="enscape-settings-button"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.fileName)}
                  title="Delete"
                  className="enscape-delete-button"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Move Modal Component */}
        <Move360Modal
          isOpen={showMoveModal}
          itemToMove={itemToMove}
          onClose={handleCloseMoveModal}
          onMoveComplete={handleMoveComplete}
        />
      </div>
    </div>
  );
};

export default EnscapeModal;
