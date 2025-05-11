
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

const SearchFilter = ({
  searchTerm,
  setSearchTerm,
  fileType,
  setFileType,
  sortOption,
  setSortOption,
}) => {
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

      {/* File Type Filter */}
      <div>
        <label style={{ fontSize: '0.95rem' }}>Filter:</label>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          style={{
            padding: '0.45rem',
            border: '1px solid #dadce0',
            borderRadius: '4px',
            fontSize: '0.95rem',
            marginLeft: '0.5rem',
          }}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort Dropdown */}
      <div>
        <label style={{ fontSize: '0.95rem' }}>Sort by:</label>
        <select
  value={sortOption ? `${sortOption.key}-${sortOption.direction}` : ''}
  onChange={(e) => {
    const value = e.target.value;
    if (value === '') {
      setSortOption(null);
    } else {
      const [key, direction] = value.split('-');
      setSortOption({ key, direction });
    }
  }}
>
  <option value="">-- Select --</option>
  {SORT_OPTIONS.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>


      </div>
      {/* ✅ Clear Filters Button */}
<button
  onClick={() => {
  setSearchTerm('');
  setFileType('all');
  setSortOption(null); // Disable sort on reset
}}

  style={{
    padding: '0.45rem',
    fontSize: '0.95rem',
    color: 'black',
    border: '1px solid rgb(218, 220, 224)',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
    cursor: 'pointer',
  }}
>
  Clear Filters
</button>
    </div>
  );
};

export default SearchFilter;
