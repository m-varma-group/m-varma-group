// qr_access_log.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import '../css/qr_access_log.css';

const PAGE_SIZE = 20;
const ROW_LIMIT = 800;

const formatDate = (ts) => {
  if (!ts) return '-';
  try {
    return (ts.toDate ? ts.toDate() : new Date(ts)).toLocaleString();
  } catch {
    return String(ts);
  }
};

const QRAccessLogModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('qrCodes');
  const [logsDrive, setLogsDrive] = useState([]);
  const [logs360, setLogs360] = useState([]);

  const [errorDrive, setErrorDrive] = useState('');
  const [error360, setError360] = useState('');

  const [search, setSearch] = useState('');

  const [pageDrive, setPageDrive] = useState(1);
  const [page360, setPage360] = useState(1);

  const [confirmDelete, setConfirmDelete] = useState(null);

  // --------------------------------------------------------------------
  // FETCH LOGS
  // --------------------------------------------------------------------
  const fetchLogs = async (source, setRows, setError) => {
    setError('');
    try {
      const q = query(
        collection(db, 'qrAccessLogs'),
        where('source', '==', source),
        orderBy('timestamp', 'desc')
      );

      const snap = await getDocs(q);
      const rows = snap.docs.slice(0, ROW_LIMIT).map((d) => ({
        _id: d.id,
        ...d.data()
      }));

      setRows(rows);
    } catch (err) {
      console.error(err);
      let msg = err.message;

      const link = msg.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
      if (link) msg += ` — create index here: ${link[0]}`;

      setError(msg);
    }
  };

  useEffect(() => {
    fetchLogs("qrCodes", setLogsDrive, setErrorDrive);
    fetchLogs("qr360", setLogs360, setError360);
  }, []);

  // --------------------------------------------------------------------
  // DELETE LOG ENTRY
  // --------------------------------------------------------------------
  const deleteLog = async (id) => {
    try {
      await deleteDoc(doc(db, "qrAccessLogs", id));
      setLogsDrive((v) => v.filter((r) => r._id !== id));
      setLogs360((v) => v.filter((r) => r._id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  };

  // --------------------------------------------------------------------
  // Filtering Function (memo safe)
  // --------------------------------------------------------------------
  const filterRows = useCallback((rows) => {
    if (!search) return rows;
    const s = search.toLowerCase();

    return rows.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(s) ||
        (r.qrName || '').toLowerCase().includes(s) ||
        (r.qrId || '').toLowerCase().includes(s)
    );
  }, [search]);

  // Filter with dependency fixed
  const filteredDrive = useMemo(
    () => filterRows(logsDrive),
    [logsDrive, filterRows]
  );

  const filtered360 = useMemo(
    () => filterRows(logs360),
    [logs360, filterRows]
  );

  // Paginate
  const paginatedDrive = filteredDrive.slice((pageDrive - 1) * PAGE_SIZE, pageDrive * PAGE_SIZE);
  const paginated360 = filtered360.slice((page360 - 1) * PAGE_SIZE, page360 * PAGE_SIZE);

  const pageCountDrive = Math.ceil(filteredDrive.length / PAGE_SIZE);
  const pageCount360 = Math.ceil(filtered360.length / PAGE_SIZE);

  const activeRows = activeTab === "qrCodes" ? paginatedDrive : paginated360;

  // Pagination setter
  const setPage = activeTab === "qrCodes" ? setPageDrive : setPage360;
  const pageCount = activeTab === "qrCodes" ? pageCountDrive : pageCount360;

  return (
    <div className="qr-modal-overlay" onMouseDown={(e) => {
      if (e.target.classList.contains("qr-modal-overlay")) onClose();
    }}>
      <div className="qr-access-modal">
        <button className="close-btn" onClick={onClose}>×</button>

        <h3>QR Access Logs</h3>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={activeTab === "qrCodes" ? "active" : ""}
            onClick={() => setActiveTab("qrCodes")}
          >
            QR Drive
          </button>

          <button
            className={activeTab === "qr360" ? "active" : ""}
            onClick={() => setActiveTab("qr360")}
          >
            QR360
          </button>
        </div>

        {/* Controls */}
        <div className="log-header-controls">
          <input
            className="search-box"
            placeholder="Search visitor, QR name, ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageDrive(1);
              setPage360(1);
            }}
          />

          <button
            className="refresh-btn"
            onClick={() => {
              if (activeTab === "qrCodes")
                fetchLogs("qrCodes", setLogsDrive, setErrorDrive);
              else
                fetchLogs("qr360", setLogs360, setError360);
            }}
          >
            Refresh
          </button>

          <button
            className="export-btn"
            onClick={() => {
              const rows = activeTab === 'qrCodes' ? filteredDrive : filtered360;

              const csv = [
                "Time,Visitor,QR Name,Short ID,Type",
                ...rows.map(r =>
                  `"${formatDate(r.timestamp)}","${r.name || ""}","${r.qrName || ""}","${r.qrId || ""}","${r.isFolder ? "Folder" : "File"}"`
                )
              ].join("\n");

              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "qr_access_logs.csv";
              a.click();
            }}
          >
            Export
          </button>
        </div>

        {/* Error */}
        {(activeTab === "qrCodes" && errorDrive) ||
        (activeTab === "qr360" && error360) ? (
          <div className="error-box">
            {activeTab === "qrCodes" ? errorDrive : error360}
          </div>
        ) : null}

        {/* TABLE (scrollable) */}
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Visitor</th>
                <th>QR Name</th>
                <th>Short ID</th>
                <th>Type</th>
                <th></th> {/* delete column */}
              </tr>
            </thead>

            <tbody>
              {activeRows.length === 0 ? (
                <tr><td colSpan="6" className="empty">No logs</td></tr>
              ) : (
                activeRows.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDate(r.timestamp)}</td>
                    <td>{r.name || "Unknown"}</td>
                    <td>{r.qrName || "-"}</td>
                    <td>{r.qrId}</td>
                    <td>{r.isFolder ? "Folder" : "File"}</td>
                    <td>
                      <button className="delete-btn" onClick={() => setConfirmDelete(r)}>
                    🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          {Array.from({ length: pageCount }).map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={i}
                className={`page-btn ${pageNum === (activeTab === "qrCodes" ? pageDrive : page360) ? "active" : ""}`}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-box">
              <p>Delete this log entry?</p>
              <div className="delete-buttons">
                <button onClick={() => deleteLog(confirmDelete._id)}>Yes</button>
                <button onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QRAccessLogModal;
