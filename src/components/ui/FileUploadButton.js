// ui/FileUploadButton.js - Updated with better feedback and UX

import React, { useRef, useState } from 'react';

const FileUploadButton = ({ 
  onFileSelect, 
  acceptedTypes = "*", 
  multiple = false, 
  disabled = false,
  maxSize = 20 * 1024 * 1024 // 20MB default max size
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  
  const handleClick = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Check file size
      const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        alert(`The following files exceed the maximum size of ${formatSize(maxSize)}: ${fileNames}`);
        return;
      }
      
      if (multiple) {
        onFileSelect(Array.from(files));
      } else {
        onFileSelect(files[0]);
      }
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  };
  
  // Format file size for display
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = e.dataTransfer.files;
      
      // Check file size
      const oversizedFiles = Array.from(droppedFiles).filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        alert(`The following files exceed the maximum size of ${formatSize(maxSize)}: ${fileNames}`);
        return;
      }
      
      if (multiple) {
        onFileSelect(Array.from(droppedFiles));
      } else {
        onFileSelect(droppedFiles[0]);
      }
    }
  };
  
  return (
    <div 
      className="file-upload-button" 
      onClick={handleClick}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        backgroundColor: dragActive 
          ? 'rgba(159, 141, 203, 0.1)' 
          : disabled 
            ? 'rgba(0,0,0,0.05)' 
            : 'transparent',
        color: disabled ? 'rgba(0,0,0,0.3)' : 'var(--text-secondary)',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        border: dragActive 
          ? '2px dashed var(--primary-color)' 
          : '1px solid #e0e0e0',
        position: 'relative',
      }}
      title={disabled ? "File upload disabled" : `Upload files (Maximum size: ${formatSize(maxSize)})`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept={acceptedTypes}
        multiple={multiple}
        disabled={disabled}
      />
      <span style={{ fontSize: '20px' }}>📎</span>
      
      {/* Tooltip on hover */}
      <div 
        className="tooltip" 
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          marginBottom: '8px',
        }}
      >
        {disabled ? "File upload disabled" : "Upload files"}
      </div>
    </div>
  );
};

export default FileUploadButton;