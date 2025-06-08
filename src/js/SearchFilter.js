import React, { useState } from 'react';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'application/vnd.google-apps.folder', label: 'Folders' },
  { value: 'application/pdf', label: 'PDF' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'application/msword', label: 'Word' },
  { value: 'application/vnd.ms-excel', label: 'Excel' },
  { value: 'application/vnd.ms-powerpoint', label: 'PowerPoint' },
  { value: 'zip', label: 'ZIP' },
  { value: 'text/plain', label: 'Text' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'A - Z' },
  { value: 'name-desc', label: 'Z - A' },
  { value: 'size-asc', label: 'Small to Large' },
  { value: 'size-desc', label: 'Large to Small' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'date-desc', label: 'Newest' },
];

export const applyFiltersAndSort = (files, searchTerm, fileType, sortOption) => {
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
    const [key, direction] = sortOption.value.split('-');

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

  return sorted;
};

const SearchFilter = ({
  searchTerm,
  setSearchTerm,
  fileType,
  setFileType,
  sortOption,
  setSortOption,
}) => {

  const [isHovering, setIsHovering] = useState(false);

  const clearFilters = () => {
    setSearchTerm('');
    setFileType('all');
    setSortOption(null);
  };

  return (
    <div
      style={{
        marginBottom: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <input
        type="text"
        placeholder="🔍 Search files..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          width: '250px',
          fontSize: '0.95rem',
        }}
      />

      <div>
        <label style={{ fontSize: '0.95rem' }}>Filter:</label>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          style={{
            padding: '0.45rem',
            fontSize: '0.95rem',
            marginLeft: '0.25rem',
          }}
        >
          {OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '0.95rem' }}>Sort:</label>
        <select
          value={sortOption?.value || ''}
          onChange={(e) => {
            const selected = SORT_OPTIONS.find(opt => opt.value === e.target.value);
            setSortOption(selected);
          }}
          style={{
            padding: '0.45rem',
            fontSize: '0.95rem',
            marginLeft: '0.25rem',
          }}
        >
          <option value="">None</option>
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <button
      onClick={clearFilters}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        padding: '0.5rem 1rem',
        fontSize: '0.9rem',
        backgroundColor: isHovering ? '#ccc' : '#E9E9ED',
        color: 'black',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      Clear Filters
    </button>
    </div>
  );
};

export default SearchFilter;
