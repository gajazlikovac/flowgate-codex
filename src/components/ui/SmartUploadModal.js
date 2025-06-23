import React, { useState, useEffect, useCallback } from 'react';
import fileUploadService from '../../services/FileUploadService';

// You may need to import Button and TagBadge from your UI library or pass them as props
// import Button from './Button';
// import TagBadge from './TagBadge';

const SmartUploadModal = ({
  isOpen,
  onClose,
  onUploadComplete,
  selectedSite,
  autoTagDocument,
  customTags = [],
  getTagDisplayName,
  Button,
  TagBadge
}) => {
  const [localFiles, setLocalFiles] = useState([]);
  const [localCurrentFileIndex, setLocalCurrentFileIndex] = useState(0);
  const [localTagSuggestions, setLocalTagSuggestions] = useState({});
  const [localSelectedTags, setLocalSelectedTags] = useState({});
  const [localUploadStep, setLocalUploadStep] = useState('select');
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelection = useCallback((selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    setLocalFiles(fileArray);
    // Generate auto-tag suggestions for each file
    const suggestions = {};
    const selected = {};
    fileArray.forEach((file, index) => {
      const autoTagResult = autoTagDocument(file, selectedSite);
      suggestions[index] = autoTagResult.suggestions;
      // Initialize selected tags with recommended tags
      selected[index] = {};
      autoTagResult.suggestions.recommended?.forEach(tag => {
        selected[index][tag.value] = tag.type;
      });
    });
    setLocalTagSuggestions(suggestions);
    setLocalSelectedTags(selected);
    setLocalUploadStep('review');
    setLocalCurrentFileIndex(0);
  }, [selectedSite, autoTagDocument]);

  const handleTagToggle = useCallback((fileIndex, tag, tagType) => {
    setLocalSelectedTags(prev => ({
      ...prev,
      [fileIndex]: {
        ...prev[fileIndex],
        [tag]: prev[fileIndex]?.[tag] ? undefined : tagType
      }
    }));
  }, []);

  const handleUpload = useCallback(async () => {
    setLocalUploadStep('upload');
    try {
      const uploadPromises = localFiles.map(async (file, index) => {
        const fileTags = localSelectedTags[index] || {};
        // Convert selected tags to proper structure
        const tagStructure = {
          location: [],
          phase: [],
          content: [],
          version: [],
          custom: []
        };
        Object.entries(fileTags).forEach(([tag, type]) => {
          if (type && tagStructure[type]) {
            tagStructure[type].push(tag);
          }
        });
        // Process file with tags
        const processedFile = await fileUploadService.processFile(file, {
          tags: tagStructure,
          site: selectedSite,
          sourceComponent: 'smartUpload'
        });
        return processedFile;
      });
      const results = await Promise.all(uploadPromises);
      onUploadComplete?.(results);
      // Reset modal state
      setLocalFiles([]);
      setLocalTagSuggestions({});
      setLocalSelectedTags({});
      setLocalUploadStep('select');
      setLocalCurrentFileIndex(0);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      setLocalUploadStep('error');
    }
  }, [localFiles, localSelectedTags, selectedSite, onUploadComplete, onClose]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files);
    }
  }, [handleFileSelection]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setLocalFiles([]);
      setLocalTagSuggestions({});
      setLocalSelectedTags({});
      setLocalUploadStep('select');
      setLocalCurrentFileIndex(0);
      setDragActive(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              🚀 Smart Document Upload
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.875rem' }}>
              AI-powered document tagging for {selectedSite !== 'all' 
                ? getTagDisplayName(selectedSite, 'location') 
                : 'All Sites'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '1.25rem',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>
        {/* Content based on step */}
        <div style={{ padding: '20px' }}>
          {localUploadStep === 'select' && (
            <div>
              <div 
                style={{
                  border: `2px dashed ${dragActive ? '#9c27b0' : '#e0e0e0'}`,
                  borderRadius: '8px',
                  padding: '60px 40px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  backgroundColor: dragActive ? 'rgba(156, 39, 176, 0.05)' : '#f9f9f9',
                  transition: 'all 0.2s ease'
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📤</div>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
                  Drop files here or click to browse
                </h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  AI will automatically suggest tags based on filename and content
                </p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelection(e.target.files)}
                  style={{ display: 'none' }}
                  id="smart-file-input"
                />
                <Button onClick={() => document.getElementById('smart-file-input').click()}>
                  Select Files
                </Button>
              </div>
              <div style={{ 
                backgroundColor: '#f0f8ff', 
                border: '1px solid #b3d9ff', 
                borderRadius: '6px', 
                padding: '16px' 
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0066cc' }}>
                  🤖 AI-Powered Features
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#0066cc' }}>
                  <li>Automatic location tagging based on site selection</li>
                  <li>Lifecycle phase detection from filename patterns</li>
                  <li>Content classification for compliance frameworks</li>
                  <li>Version control and metadata extraction</li>
                </ul>
              </div>
            </div>
          )}
          {localUploadStep === 'review' && localFiles.length > 0 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Review AI-Generated Tags</h3>
                <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
                  Review and modify suggested tags for each file. Green tags are high-confidence recommendations.
                </p>
              </div>
              {/* File tabs */}
              <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid #e0e0e0', 
                marginBottom: '20px',
                overflowX: 'auto'
              }}>
                {localFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => setLocalCurrentFileIndex(index)}
                    style={{
                      padding: '12px 16px',
                      border: 'none',
                      background: localCurrentFileIndex === index ? '#f8f9fa' : 'transparent',
                      cursor: 'pointer',
                      borderBottom: localCurrentFileIndex === index ? '3px solid #9c27b0' : '3px solid transparent',
                      fontSize: '0.875rem',
                      fontWeight: localCurrentFileIndex === index ? '600' : '400',
                      whiteSpace: 'nowrap',
                      minWidth: '120px'
                    }}
                  >
                    📄 {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                  </button>
                ))}
              </div>
              {/* Current file tag review */}
              {localFiles[localCurrentFileIndex] && (
                <div>
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '16px', 
                    borderRadius: '6px', 
                    marginBottom: '20px' 
                  }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>
                      📁 {localFiles[localCurrentFileIndex].name}
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Size: {(localFiles[localCurrentFileIndex].size / 1024 / 1024).toFixed(2)} MB • 
                      Type: {localFiles[localCurrentFileIndex].type}
                    </div>
                  </div>
                  {/* Recommended tags */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ color: '#4caf50', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                      ✅ Recommended Tags (High Confidence)
                    </h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {localTagSuggestions[localCurrentFileIndex]?.recommended?.map(tag => (
                        <TagBadge
                          key={tag.value}
                          tag={tag.value}
                          type={tag.type}
                          clickable
                          selected={!!localSelectedTags[localCurrentFileIndex]?.[tag.value]}
                          onClick={() => handleTagToggle(localCurrentFileIndex, tag.value, tag.type)}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Optional tags */}
                  {localTagSuggestions[localCurrentFileIndex]?.optional?.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h5 style={{ color: '#ff9800', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                        ⚠️ Optional Tags (Medium Confidence)
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {localTagSuggestions[localCurrentFileIndex].optional.map(tag => (
                          <TagBadge
                            key={tag.value}
                            tag={tag.value}
                            type={tag.type}
                            clickable
                            selected={!!localSelectedTags[localCurrentFileIndex]?.[tag.value]}
                            onClick={() => handleTagToggle(localCurrentFileIndex, tag.value, tag.type)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Custom tags */}
                  {customTags.length > 0 && (
                    <div>
                      <h5 style={{ marginBottom: '12px' }}>🏷️ Custom Tags</h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {customTags.map(tag => (
                          <TagBadge
                            key={tag.id}
                            tag={tag.name}
                            type="custom"
                            clickable
                            selected={!!localSelectedTags[localCurrentFileIndex]?.[tag.name]}
                            onClick={() => handleTagToggle(localCurrentFileIndex, tag.name, 'custom')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {localUploadStep === 'upload' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #9c27b0',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <h3 style={{ margin: '0 0 8px 0' }}>Processing {localFiles.length} files...</h3>
              <p style={{ color: '#666', margin: 0 }}>
                Applying smart tags and uploading to secure storage
              </p>
            </div>
          )}
          {localUploadStep === 'error' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
              <h3 style={{ color: '#f44336', margin: '0 0 8px 0' }}>Upload Failed</h3>
              <p style={{ color: '#666', margin: '0 0 20px 0' }}>
                There was an error processing your files. Please try again.
              </p>
              <Button onClick={() => setLocalUploadStep('select')}>
                Try Again
              </Button>
            </div>
          )}
        </div>
        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            {localUploadStep === 'review' && localFiles.length > 0 && (
              `File ${localCurrentFileIndex + 1} of ${localFiles.length}`
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {localUploadStep === 'review' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setLocalUploadStep('select')}
                >
                  ← Back
                </Button>
                <Button onClick={handleUpload}>
                  Upload {localFiles.length} File{localFiles.length !== 1 ? 's' : ''}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartUploadModal; 