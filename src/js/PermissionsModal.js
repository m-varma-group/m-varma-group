import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/PermissionsModal.css';
import { truncateFileName } from './utils.js';

const PermissionsModal = ({ fileId, fileName, accessToken, onClose }) => {
  const [permissions, setPermissions] = useState([]);
  const [accessLevel, setAccessLevel] = useState('restricted');
  const [writersCanShare, setWritersCanShare] = useState(false);
  const [copyRequiresWriterPermission, setCopyRequiresWriterPermission] = useState(false);
  const [newPermissionEmail, setNewPermissionEmail] = useState('');
  const [newPermissionRole, setNewPermissionRole] = useState('reader');
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [isFolder, setIsFolder] = useState(false);


  useEffect(() => {
    fetchPermissions();
    // eslint-disable-next-line
  }, []);

  const fetchPermissions = async () => {
    try {
      const fileRes = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=copyRequiresWriterPermission,writersCanShare,mimeType`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      setCopyRequiresWriterPermission(fileRes.data.copyRequiresWriterPermission);
      setWritersCanShare(fileRes.data.writersCanShare);
      setIsFolder(fileRes.data.mimeType === 'application/vnd.google-apps.folder');
      
      const permsRes = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,type)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const perms = permsRes.data.permissions || [];
      setPermissions(perms);

      const anyonePermission = perms.find((perm) => perm.type === 'anyone');
      setAccessLevel(anyonePermission ? 'anyone' : 'restricted');

      setLoading(false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setLoading(false);
    }
  };


  const addPermission = async () => {
    if (!newPermissionEmail) return;
    try {
      await axios.post(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          type: 'user',
          role: newPermissionRole.toLowerCase(),
          emailAddress: newPermissionEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setNewPermissionEmail('');
      fetchPermissions();
    } catch (error) {
      console.error('Error adding permission:', error);
    }
  };

  const removePermission = async (permissionId) => {
    try {
      await axios.delete(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permissionId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      fetchPermissions();
    } catch (error) {
      console.error('Error removing permission:', error);
    }
  };

  const updateFileSettings = async () => {
  try {

    const fileMeta = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const isFolder = fileMeta.data.mimeType === 'application/vnd.google-apps.folder';

    if (!isFolder) {
      // If it's a file, update it directly
      await axios.patch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          copyRequiresWriterPermission,
          writersCanShare,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {

      const res = await axios.get(
        `https://www.googleapis.com/drive/v3/files?q='${fileId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const children = res.data.files;

      const filesOnly = children.filter(child => child.mimeType !== 'application/vnd.google-apps.folder');

      await Promise.all(
        filesOnly.map((file) =>
          axios.patch(
            `https://www.googleapis.com/drive/v3/files/${file.id}`,
            {
              copyRequiresWriterPermission,
              writersCanShare,
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          ).catch((err) => {
            console.error(`Error updating file ${file.id}:`, err);
          })
        )
      );
    }
  } catch (error) {
    console.error('Error updating file/folder settings:', error);
  }
};


  const handleAccessLevelChange = async (e) => {
    const newAccessLevel = e.target.value;
    setAccessLevel(newAccessLevel);

    try {
      const anyonePermission = permissions.find((perm) => perm.type === 'anyone');
      if (anyonePermission) {
        await axios.delete(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${anyonePermission.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      }

      if (newAccessLevel === 'anyone') {
        await axios.post(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
          {
            type: 'anyone',
            role: 'reader',
            allowFileDiscovery: false,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      fetchPermissions();
    } catch (error) {
      console.error('Error updating access level:', error);
    }
  };

  const handleSaveSettings = async () => {
    await updateFileSettings();
    handleClose();
  };

  const handleClose = () => {
    setFadeOut(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  const roleDisplayMap = {
    reader: 'Viewer',
    writer: 'Editor',
    commenter: 'Commenter',
    owner: 'Owner',
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content ${fadeOut ? 'fade-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Share settings for "{truncateFileName(fileName)}"</h2>

        <div>
          <label>
            Access Level:
            <p></p>
            <select value={accessLevel} onChange={handleAccessLevelChange}>
              <option value="restricted">Restricted</option>
              <option value="anyone">Anyone with the link</option>
            </select>
          </label>
        </div>

        <div>
          <p>Permissions:</p>
          <div className="radio-group">
            {!isFolder && (
              <label>
                <input
                  type="radio"
                  name="sharingOptions"
                  value="enable"
                  checked={writersCanShare && !copyRequiresWriterPermission}
                  onChange={() => {
                    setWritersCanShare(true);
                    setCopyRequiresWriterPermission(false);
                  }}
                />
                Allow users to download/print/copy
              </label>
            )}
            {isFolder && <br />}
            <label>
              <input
                type="radio"
                name="sharingOptions"
                value="disable"
                checked={!writersCanShare && copyRequiresWriterPermission}
                onChange={() => {
                  setWritersCanShare(false);
                  setCopyRequiresWriterPermission(true);
                }}
              />
              Disable download/print/copy for users
            </label>
          </div>
        </div>



        <div className="permissions-modal-actions">
          <button className="save-close-permission-button" onClick={handleSaveSettings}>
            Save
          </button>
          <button className="save-close-permission-button" onClick={handleClose}>
            Cancel
          </button>
        </div>

        <div>
          <h3>Invite People</h3>
          <div className="invite-row">
            <input
              type="email"
              placeholder="Email address"
              value={newPermissionEmail}
              onChange={(e) => setNewPermissionEmail(e.target.value)}
            />
            <select
              value={newPermissionRole}
              onChange={(e) => setNewPermissionRole(e.target.value)}
            >
              <option value="Viewer">Viewer</option>
              <option value="Commenter">Commenter</option>
              <option value="Writer">Editor</option>
            </select>
            <button className="add-permission-button" onClick={addPermission}>
              Add
            </button>
          </div>
        </div>

        <div>
          <h3>Current Permissions</h3>
          <div className="scrollable-permissions">
            <ul>
              {permissions.map((perm) => (
                <li key={perm.id}>
                  {perm.emailAddress || perm.type} - {roleDisplayMap[perm.role] || perm.role}
                  {perm.role !== 'owner' && (
                    <button onClick={() => removePermission(perm.id)}>Remove</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
