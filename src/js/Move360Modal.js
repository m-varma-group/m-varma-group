import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

const Move360Modal = ({ isOpen, itemToMove, onClose, onMoveComplete }) => {
  const [allFolders, setAllFolders] = useState([]);
  const [movePath, setMovePath] = useState([{ name: 'root', id: null }]);
  const currentMoveFolderId = movePath[movePath.length - 1].id;

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, '360_urls'), where('isFolder', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const folders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllFolders(folders);
    });

    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMovePath([{ name: 'root', id: null }]);
    }
  }, [isOpen]);

  const handleMoveNavigatePath = (index) => {
    setMovePath((prev) => prev.slice(0, index + 1));
  };

  const handleOpenMoveFolder = (folder) => {
    setMovePath((prev) => [...prev, { name: folder.fileName, id: folder.id }]);
  };

  const getFoldersInCurrentMoveLocation = () =>
    allFolders.filter((folder) => folder.parentId === currentMoveFolderId);

  const isValidMoveDestination = (destinationId) => {
    if (!itemToMove) return false;
    if (destinationId === itemToMove.parentId) return false;
    if (itemToMove.isFolder) {
      return !isChildFolder(destinationId, itemToMove.id);
    }
    return true;
  };

  const isChildFolder = (potentialChildId, parentId) => {
    if (!potentialChildId || potentialChildId === parentId) return true;
    const folder = allFolders.find((f) => f.id === potentialChildId);
    if (!folder || !folder.parentId) return false;
    return isChildFolder(folder.parentId, parentId);
  };

  const checkNameConflictInDestination = async (destinationId, fileName) => {
    const q = query(
      collection(db, '360_urls'),
      where('parentId', '==', destinationId || null),
      where('fileName', '==', fileName)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleConfirmMove = async () => {
    if (!itemToMove || !isValidMoveDestination(currentMoveFolderId)) {
      alert('Invalid move destination.');
      return;
    }

    const hasConflict = await checkNameConflictInDestination(currentMoveFolderId, itemToMove.fileName);
    if (hasConflict) {
      alert(`An item with the name "${itemToMove.fileName}" already exists in the destination folder.`);
      return;
    }

    try {
      await updateDoc(doc(db, '360_urls', itemToMove.id), {
        parentId: currentMoveFolderId || null,
      });

      alert(`"${itemToMove.fileName}" moved successfully.`);
      onMoveComplete();
    } catch (error) {
      alert('Failed to move item.');
    }
  };

  const getCurrentMoveLocationName = () => {
    return movePath.length === 1 ? 'Root' : movePath[movePath.length - 1].name;
  };

  if (!isOpen || !itemToMove) return null;

  return (
    <div
      className="enscape-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1001,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        className="enscape-modal-main"
        style={{
          position: 'relative',
          backgroundColor: '#fff',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90%',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close Button - Positioned absolutely inside the modal container */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            fontSize: '16px',
            cursor: 'pointer',
            zIndex: 100,
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div
          className="enscape-modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #ddd',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          Move "{itemToMove.fileName}"
        </div>

        {/* Path Navigation */}
        <div
          className="enscape-path"
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {movePath.length > 1 && (
            <button
            className="enscape-back-button"
            onClick={() => handleMoveNavigatePath(movePath.length - 2)}
            style={{
                marginRight: '12px',
                background: '#007bff',
                color: '#fff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
            }}
            >
            ← Back
            </button>
          )}
          <span>
            <strong>Moving to:</strong>{' '}
            {movePath.map((p, index) => (
              <span
                key={p.id || 'root'}
                onClick={() => handleMoveNavigatePath(index)}
                style={{
                  cursor: 'pointer',
                  color: '#007bff',
                }}
              >
                {p.name}
                {index < movePath.length - 1 && ' / '}
              </span>
            ))}
          </span>
        </div>

        {/* Folder List */}
        <div
          className="enscape-modal-file-list"
          style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}
        >
          {getFoldersInCurrentMoveLocation().length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666' }}>
              No folders in this location
            </div>
          ) : (
            getFoldersInCurrentMoveLocation().map((folder) => (
              <div
                key={folder.id}
                className="enscape-file-item"
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                }}
              >
                <span
                  onClick={() => handleOpenMoveFolder(folder)}
                  style={{ fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' }}
                >
                  <span style={{ marginRight: '10px' }}>📁</span> {folder.fileName}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #eee',
            textAlign: 'center',
          }}
        >
          <p>
            <strong>Destination:</strong> {getCurrentMoveLocationName()}
          </p>
          <div
            style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'center',
                gap: '10px', // space between buttons
                flexWrap: 'wrap', // responsive support
            }}
            >
            <button
                onClick={handleConfirmMove}
                disabled={!isValidMoveDestination(currentMoveFolderId)}
                style={{
                backgroundColor: isValidMoveDestination(currentMoveFolderId) ? '#28a745' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: isValidMoveDestination(currentMoveFolderId) ? 'pointer' : 'not-allowed',
                }}
            >
                Move Here
            </button>
            <button
                onClick={onClose}
                style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                }}
            >
                Cancel
            </button>
            </div>
          {!isValidMoveDestination(currentMoveFolderId) && (
            <div style={{ marginTop: '10px', color: '#dc3545', fontSize: '12px' }}>
              {currentMoveFolderId === itemToMove.parentId
                ? 'Item is already in this location'
                : 'Cannot move folder to its own subfolder'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Move360Modal;
