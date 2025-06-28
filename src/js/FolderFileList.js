import React, { useEffect, useState } from 'react';
import getFileIcon from './FileIcon';
import '../css/DriveEmbedding.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams } from 'react-router-dom';

const FolderFileList = ({ shortId: propShortId, label: propLabel, source: propSource }) => {
  const { id: routeId } = useParams();
  const shortId = propShortId || routeId;
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState(propLabel);
  /* eslint-disable-next-line */
  const [source, setSource] = useState(propSource);

  useEffect(() => {
    const fetchFolderData = async () => {
      try {
        const collections = ['qrCodes', 'qr360'];
        let docSnap = null;
        for (const collection of collections) {
          const docRef = doc(db, collection, shortId);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            docSnap = snapshot;
            setSource(collection);
            break;
          }
        }

        if (docSnap) {
          const data = docSnap.data();
          if (data.folderContents) {
            setFiles(data.folderContents);
          } else {
            setError('No folder contents found.');
          }
          if (data.label) {
            setLabel(data.label);
          } else if (data.fileName) {
            setLabel(data.fileName);
          }
        } else {
          setError('QR not found.');
        }
      } catch (err) {
        console.error('Failed to fetch folder metadata:', err);
        setError('Failed to load folder contents.');
      } finally {
        setLoading(false);
      }
    };

    fetchFolderData();
  }, [shortId]);

  const getPreviewUrl = (file) => {
    const { id, type } = file;
    if (type === 'application/vnd.google-apps.document') {
      return `https://docs.google.com/document/d/${id}/preview`;
    } else if (type === 'application/vnd.google-apps.spreadsheet') {
      return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    } else if (type === 'application/vnd.google-apps.presentation') {
      return `https://docs.google.com/presentation/d/${id}/preview`;
    } else {
      return `https://drive.google.com/file/d/${id}/preview`;
    }
  };


if (selectedFile) {
  const previewUrl = getPreviewUrl(selectedFile);
  return (
    <div className="file-embed-container">
      <iframe src={previewUrl} title="Preview" allowFullScreen />
      <div className="iframe-blocker" />
      <button
        className="primary-button"
        onClick={() => setSelectedFile(null)}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 1001,
        }}
      >
        ←
      </button>
    </div>
  );
}

  return (
    <main>
      <h1>{label || 'Folder Contents'}</h1>

      {loading && <p>Loading files...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {files.map((file) => (
          <li key={file.id} onClick={() => setSelectedFile(file)}>
            <div className="file-item">
              {/* eslint-disable-next-line */}
              <a className="file-link" href="#" onClick={(e) => e.preventDefault()}>
                <span className="file-icon">{getFileIcon(file.type)}</span>
                <span className="file-name">{file.name}</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default FolderFileList;
