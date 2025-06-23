// FilePreview.js - Create this component to show file previews

import React from 'react';

const FilePreview = ({ file, onRemove }) => {
  // Function to get appropriate icon based on file type
  const getFileIcon = (fileType) => {
    if (!fileType) return '📎';
    
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('csv')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('audio')) return '🔊';
    if (fileType.includes('video')) return '🎬';
    return '📎';
  };
  
  // Format file size in a readable way
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  return (
    <div className="file-preview" style={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.03)',
      padding: '6px 12px',
      borderRadius: '8px',
      marginTop: '8px',
      marginBottom: '8px',
      maxWidth: '100%',
      overflow: 'hidden',
    }}>
      <div className="file-icon" style={{ marginRight: '8px', fontSize: '20px' }}>
        {getFileIcon(file.type)}
      </div>
      
      <div className="file-info" style={{ 
        flex: 1, 
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}>
        <div className="file-name" style={{ 
          fontWeight: '500',
          fontSize: '14px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {file.name}
        </div>
        <div className="file-size" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {formatFileSize(file.size)}
        </div>
      </div>
      
      <button 
        className="remove-file-button" 
        onClick={() => onRemove(file.id || file)}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '14px',
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default FilePreview;