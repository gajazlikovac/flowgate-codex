// DocumentUploadModal.js - Updated to use enhanced FileUploadService
import React, { useState, useEffect, useRef, useCallback } from 'react';
import fileUploadService from '../../services/FileUploadService';

const DocumentUploadModal = ({ workflow, onClose, onUploadComplete }) => {
  // State management
  const [activeTab, setActiveTab] = useState('upload');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);
  const progressIntervals = useRef({});

  // Clean up progress intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(progressIntervals.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, []);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);
  
  // Handle file selection with enhanced categorization
  const handleFileSelect = useCallback(async (files) => {
    if (files.length === 0) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      
      // Validate total file size
      const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB
      const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
      
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error(`Total size of ${fileUploadService.formatFileSize(totalSize)} exceeds the maximum of ${fileUploadService.formatFileSize(MAX_TOTAL_SIZE)}`);
      }
      
      // Process each file
      const uploadPromises = [];
      
      for (const file of Array.from(files)) {
        try {
          // Validate file type
          if (!fileUploadService.isSupportedFileType(file.type)) {
            console.warn(`Skipping unsupported file: ${file.name} (${file.type})`);
            continue;
          }
          
          // Validate individual file size
          if (file.size > fileUploadService.maxFileSize) {
            console.warn(`Skipping file that exceeds maximum size: ${file.name} (${fileUploadService.formatFileSize(file.size)})`);
            continue;
          }
          
          // Process the file with enhanced context for better categorization
          const processPromise = fileUploadService.processFile(file, {
            workflow: workflow,
            sourceComponent: 'documentUploadModal',
          });
          
          // Add to promises array
          uploadPromises.push(processPromise);
          
          // Track progress
          processPromise.then(processedFile => {
            // Clear any existing interval for this file
            if (progressIntervals.current[processedFile.id]) {
              clearInterval(progressIntervals.current[processedFile.id]);
            }
            
            // Set up interval to track progress
            progressIntervals.current[processedFile.id] = setInterval(() => {
              const fileInfo = fileUploadService.getFileDisplayInfo(processedFile.id);
              
              setUploadProgress(prev => ({
                ...prev,
                [processedFile.id]: fileInfo
              }));
              
              // If file is fully processed or error occurred, clear the interval
              if (['processed', 'uploaded', 'complete', 'error'].includes(fileInfo.status)) {
                clearInterval(progressIntervals.current[processedFile.id]);
                delete progressIntervals.current[processedFile.id];
              }
            }, 500);
          });
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          // Continue with other files
        }
      }
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Notify parent component of completion
      if (onUploadComplete && results.length > 0) {
        onUploadComplete(results);
      }
      
      // Switch to status tab
      setActiveTab('status');
    } catch (error) {
      console.error("File upload error:", error);
      setUploadError(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [workflow, onUploadComplete]);
  
  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  }, [handleFileSelect]);
  
  // Handle remote PDF upload with enhanced categorization
  const handleRemotePDFUpload = useCallback(async () => {
    if (!remoteUrl || !displayName) {
      setUploadError('URL and display name are required');
      return;
    }
    
    // Validate URL
    try {
      new URL(remoteUrl);
    } catch (_) {
      setUploadError('Please enter a valid URL');
      return;
    }
    
    try {
      setUploading(true);
      setUploadError(null);
      
      // Upload remote PDF with workflow context for proper categorization
      const processedFile = await fileUploadService.uploadRemotePDF(remoteUrl, displayName, {
        workflow: workflow,
        sourceComponent: 'documentUploadModal'
      });
      
      // Track progress
      const fileId = processedFile.name || `remote_${Date.now()}`;
      
      // Set up interval to track progress
      progressIntervals.current[fileId] = setInterval(() => {
        const fileInfo = fileUploadService.getFileDisplayInfo(fileId);
        
        if (fileInfo) {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: fileInfo
          }));
          
          // If file is fully processed or error occurred, clear the interval
          if (['processed', 'uploaded', 'complete', 'error'].includes(fileInfo.status)) {
            clearInterval(progressIntervals.current[fileId]);
            delete progressIntervals.current[fileId];
            
            // Notify parent component
            if (onUploadComplete && fileInfo.status !== 'error') {
              onUploadComplete([fileInfo]);
            }
          }
        }
      }, 500);
      
      // Switch to status tab
      setActiveTab('status');
      
      // Clear form
      setRemoteUrl('');
      setDisplayName('');
    } catch (error) {
      console.error("Remote PDF upload error:", error);
      setUploadError(`Remote PDF upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }, [remoteUrl, displayName, workflow, onUploadComplete]);
  
  // Handle critical document upload with proper document name
  const handleCriticalDocumentUpload = useCallback((docId) => {
    // Find the critical document
    const criticalDoc = workflow.criticalDocuments.find(doc => doc.id === docId);
    if (!criticalDoc) return;
    
    // Create a file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.xlsx,.csv,.txt,.jpg,.png';
    
    // Handle file selection
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        
        // Process the file with critical document context for better categorization
        handleFileSelect([file]);
        
        // Also pass the critical document name for categorization when calling processFile
        fileUploadService.processFile(file, {
          workflow: workflow,
          documentName: criticalDoc.name,
          sourceComponent: 'documentUploadModal'
        }).then(processedFile => {
          // Store reference for tracking
          setUploadProgress(prev => ({
            ...prev,
            [processedFile.id]: fileUploadService.getFileDisplayInfo(processedFile.id)
          }));
        });
      }
    };
    
    // Trigger file selection
    fileInput.click();
  }, [workflow, handleFileSelect]);
  
  // Get status badge for a file
  const getStatusBadge = useCallback((status) => {
    switch(status) {
      case 'processed':
      case 'uploaded':
      case 'complete':
        return { color: '#4caf50', text: 'Complete' };
      case 'queued':
        return { color: '#9e9e9e', text: 'Queued' };
      case 'processing':
      case 'processing_remote':
      case 'processing_gemini':
        return { color: '#673ab7', text: 'Processing' };
      case 'downloading':
        return { color: '#2196f3', text: 'Downloading' };
      case 'uploading':
      case 'uploading_gemini':
      case 'uploading_to_gcs':
        return { color: '#2196f3', text: 'Uploading' };
      case 'error':
        return { color: '#f44336', text: 'Error' };
      case 'needs_reupload':
        return { color: '#ff9800', text: 'Needs Reupload' };
      default:
        return { color: '#9e9e9e', text: status || 'Unknown' };
    }
  }, []);
  
  // Get files that have been successfully uploaded
  const completedUploads = Object.values(uploadProgress).filter(
    file => file && (file.status === 'processed' || file.status === 'uploaded' || file.status === 'complete')
  );
  
  // Map of critical documents that have been uploaded
  const criticalDocsUploaded = {};
  if (workflow && workflow.criticalDocuments) {
    workflow.criticalDocuments.forEach(doc => {
      // Check if any completed upload matches this critical document
      const matchedFile = completedUploads.find(file => 
        file.name && (file.name.includes(doc.name) || (file.criticalDocName && file.criticalDocName === doc.name))
      );
      
      criticalDocsUploaded[doc.id] = !!matchedFile;
    });
  }
  
  if (!workflow) return null;
  
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        width: "91.666667%",
        maxWidth: "48rem",
        maxHeight: "90vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{
          borderBottom: "1px solid #e0e0e0",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ 
            fontSize: "1.25rem", 
            fontWeight: 600 
          }}>Document Upload Center</h2>
          <button 
            onClick={onClose}
            style={{
              color: "#6b7280",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div style={{ 
          borderBottom: "1px solid #e0e0e0",
          display: "flex"
        }}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              fontWeight: activeTab === 'upload' ? 600 : 500,
              color: activeTab === 'upload' ? "#9c27b0" : "#6b7280",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === 'upload' ? "2px solid #9c27b0" : "2px solid transparent",
              cursor: "pointer"
            }}
          >
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab('remote')}
            style={{
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              fontWeight: activeTab === 'remote' ? 600 : 500,
              color: activeTab === 'remote' ? "#9c27b0" : "#6b7280",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === 'remote' ? "2px solid #9c27b0" : "2px solid transparent",
              cursor: "pointer"
            }}
          >
            Remote PDF
          </button>
          <button
            onClick={() => setActiveTab('status')}
            style={{
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              fontWeight: activeTab === 'status' ? 600 : 500,
              color: activeTab === 'status' ? "#9c27b0" : "#6b7280",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === 'status' ? "2px solid #9c27b0" : "2px solid transparent",
              cursor: "pointer",
              position: "relative"
            }}
          >
            Status
            {Object.keys(uploadProgress).length > 0 && (
              <span style={{
                position: "absolute",
                top: "0.25rem",
                right: "0.25rem",
                borderRadius: "9999px",
                backgroundColor: "#9c27b0",
                color: "white",
                fontSize: "0.75rem",
                lineHeight: 1,
                fontWeight: 600,
                padding: "0.125rem 0.375rem",
                minWidth: "1.25rem",
                textAlign: "center"
              }}>
                {Object.keys(uploadProgress).length}
              </span>
            )}
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Upload Files Tab */}
          {activeTab === 'upload' && (
            <div style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "1rem"
                }}>
                  Upload the critical documents needed for {workflow.title}. These documents significantly impact your Audit Readiness Score.
                </p>
                
                <div style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  overflow: "hidden"
                }}>
                  <table style={{
                    minWidth: "100%",
                    borderCollapse: "collapse"
                  }}>
                    <thead style={{ backgroundColor: "#f9fafb" }}>
                      <tr>
                        <th style={{
                          padding: "0.75rem 1rem",
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6b7280"
                        }}>Document</th>
                        <th style={{
                          padding: "0.75rem 1rem",
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6b7280"
                        }}>Status</th>
                        <th style={{
                          padding: "0.75rem 1rem",
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6b7280"
                        }}>Category</th>
                        <th style={{
                          padding: "0.75rem 1rem",
                          textAlign: "right",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#6b7280"
                        }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflow.criticalDocuments && workflow.criticalDocuments.map((doc, index) => (
                        <tr key={doc.id} style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                        }}>
                          <td style={{
                            padding: "0.75rem 1rem",
                            fontSize: "0.875rem",
                            borderBottom: index < workflow.criticalDocuments.length - 1 ? "1px solid #e5e7eb" : "none"
                          }}>
                            <div style={{ fontWeight: 500 }}>{doc.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{doc.description}</div>
                          </td>
                          <td style={{
                            padding: "0.75rem 1rem",
                            fontSize: "0.875rem",
                            borderBottom: index < workflow.criticalDocuments.length - 1 ? "1px solid #e5e7eb" : "none"
                          }}>
                            <span style={{
                              display: "inline-block",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              color: "white",
                              backgroundColor: 
                                criticalDocsUploaded[doc.id] ? "#10b981" : 
                                doc.status === "required" ? "#ef4444" : 
                                doc.status === "recommended" ? "#f59e0b" : 
                                "#6b7280",
                              borderRadius: "0.375rem"
                            }}>
                              {criticalDocsUploaded[doc.id] ? "Uploaded" : doc.status}
                            </span>
                          </td>
                          <td style={{
                            padding: "0.75rem 1rem",
                            fontSize: "0.875rem",
                            borderBottom: index < workflow.criticalDocuments.length - 1 ? "1px solid #e5e7eb" : "none"
                          }}>
                            {fileUploadService.documentTypeToVaultCategoryMap[doc.name] ? (
                              <span style={{
                                display: "inline-block",
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                color: "#4b5563",
                                backgroundColor: "#f3f4f6",
                                borderRadius: "0.25rem"
                              }}>
                                {fileUploadService.getCategoryLabel(fileUploadService.documentTypeToVaultCategoryMap[doc.name])}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Auto-categorized</span>
                            )}
                          </td>
                          <td style={{
                            padding: "0.75rem 1rem",
                            fontSize: "0.875rem",
                            textAlign: "right",
                            borderBottom: index < workflow.criticalDocuments.length - 1 ? "1px solid #e5e7eb" : "none"
                          }}>
                            {criticalDocsUploaded[doc.id] ? (
                              <button style={{
                                padding: "0.25rem 0.5rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                backgroundColor: "white",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                color: "#374151",
                                cursor: "pointer"
                              }}>
                                View
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCriticalDocumentUpload(doc.id)}
                                disabled={uploading}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  border: "none",
                                  borderRadius: "0.375rem",
                                  backgroundColor: "#3b82f6",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  color: "white",
                                  cursor: uploading ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  opacity: uploading ? 0.7 : 1
                                }}
                              >
                                {uploading ? "Processing..." : "Upload"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 style={{ 
                  fontSize: "1rem", 
                  fontWeight: 600,
                  marginBottom: "0.75rem"
                }}>Upload Additional Documents</h3>
                
                <div 
                  style={{
                    border: `2px dashed ${dragActive ? '#9c27b0' : '#e5e7eb'}`,
                    borderRadius: "0.5rem",
                    padding: "2rem",
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    backgroundColor: dragActive ? 'rgba(156, 39, 176, 0.05)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#9ca3af", margin: "0 auto 0.75rem" }}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                  </svg>
                  
                  <h4 style={{ 
                    fontSize: "0.875rem", 
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: "0.25rem"
                  }}>
                    Drag and drop files here
                  </h4>
                  
                  <p style={{ 
                    fontSize: "0.75rem", 
                    color: "#6b7280",
                    marginBottom: "1rem"
                  }}>
                    Or click to browse from your computer
                  </p>
                  
                  <div>
                    <input 
                      type="file" 
                      id="file-upload" 
                      multiple 
                      onChange={handleFileInputChange} 
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".pdf,.docx,.xlsx,.csv,.txt,.jpg,.png"
                    />
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      disabled={uploading}
                      style={{
                        padding: "0.5rem 1rem",
                        border: "none",
                        borderRadius: "0.375rem",
                        backgroundColor: uploading ? "#d1d5db" : "#9c27b0",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "white",
                        cursor: uploading ? "not-allowed" : "pointer",
                        opacity: uploading ? 0.7 : 1
                      }}
                    >
                      {uploading ? "Processing..." : "Select Files"}
                    </button>
                  </div>
                  
                  <p style={{ 
                    fontSize: "0.75rem", 
                    color: "#6b7280",
                    marginTop: "0.75rem"
                  }}>
                    Supported formats: PDF, Word, Excel, CSV, images, and text files (max 50MB per file)
                  </p>
                </div>
                
                {uploadError && (
                  <div style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "0.375rem",
                    padding: "0.75rem",
                    marginBottom: "1rem",
                    color: "#ef4444",
                    fontSize: "0.875rem"
                  }}>
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Remote PDF Tab */}
          {activeTab === 'remote' && (
            <div style={{ padding: "1.5rem" }}>
              <p style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                marginBottom: "1.5rem"
              }}>
                Import a PDF file from a remote URL. This is useful for documents that are published online or stored in external systems.
              </p>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}>
                  PDF URL
                </label>
                <input
                  type="url"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    marginBottom: "0.5rem"
                  }}
                  disabled={uploading}
                />
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter a name for this document"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    marginBottom: "0.5rem"
                  }}
                  disabled={uploading}
                />
              </div>
              
              {uploadError && (
                <div style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "0.375rem",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  color: "#ef4444",
                  fontSize: "0.875rem"
                }}>
                  {uploadError}
                </div>
              )}
              
              <div style={{ textAlign: "right" }}>
                <button
                  onClick={handleRemotePDFUpload}
                  disabled={!remoteUrl || !displayName || uploading}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "0.375rem",
                    backgroundColor: (!remoteUrl || !displayName || uploading) ? "#d1d5db" : "#9c27b0",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "white",
                    cursor: (!remoteUrl || !displayName || uploading) ? "not-allowed" : "pointer",
                    opacity: (!remoteUrl || !displayName || uploading) ? 0.7 : 1
                  }}
                >
                  {uploading ? "Processing..." : "Import PDF"}
                </button>
              </div>
            </div>
          )}
          
          {/* Status Tab */}
          {activeTab === 'status' && (
            <div style={{ padding: "1.5rem" }}>
              {Object.keys(uploadProgress).length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "3rem 1.5rem",
                  color: "#6b7280"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>No Documents Uploaded</p>
                  <p style={{ fontSize: "0.75rem" }}>Upload documents to see their status here</p>
                </div>
              ) : (
                <div>
                  <h3 style={{ 
                    fontSize: "1rem", 
                    fontWeight: 600,
                    marginBottom: "1rem"
                  }}>Document Status</h3>
                  
                  <div style={{ 
                    display: "grid",
                    gap: "1rem"
                  }}>
                    {Object.entries(uploadProgress).map(([fileId, file]) => (
                      <div key={fileId} style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.5rem",
                        padding: "1rem",
                        backgroundColor: "white"
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.5rem"
                        }}>
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{file.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                              {file.size} • 
                              {file.category && (
                                <span style={{
                                  display: "inline-block",
                                  padding: "0.125rem 0.375rem",
                                  fontSize: "0.75rem",
                                  fontWeight: "500",
                                  color: "#4b5563",
                                  backgroundColor: "#f3f4f6",
                                  borderRadius: "0.25rem",
                                  marginLeft: "0.25rem"
                                }}>
                                  {fileUploadService.getCategoryLabel(file.category)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span style={{
                              display: "inline-block",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              color: "white",
                              backgroundColor: getStatusBadge(file.status).color,
                              borderRadius: "0.375rem"
                            }}>
                              {getStatusBadge(file.status).text}
                            </span>
                          </div>
                        </div>
                        
                        {['uploading', 'uploading_gemini', 'uploading_to_gcs', 'processing', 'processing_gemini', 'downloading'].includes(file.status) && (
                          <div style={{ marginBottom: "0.5rem" }}>
                            <div style={{
                              backgroundColor: "#e5e7eb",
                              borderRadius: "0.25rem",
                              height: "0.5rem",
                              overflow: "hidden"
                            }}>
                              <div style={{
                                backgroundColor: file.status.includes('processing') ? "#673ab7" : "#2196f3",
                                height: "100%",
                                width: `${file.uploadProgress || 0}%`,
                                transition: "width 0.3s ease"
                              }}></div>
                            </div>
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.75rem",
                              color: "#6b7280",
                              marginTop: "0.25rem"
                            }}>
                              <span>{file.uploadProgress ? `${Math.round(file.uploadProgress)}%` : '—'}</span>
                              {file.estimatedTimeRemaining && <span>{file.estimatedTimeRemaining}</span>}
                            </div>
                          </div>
                        )}
                        
                        {file.status === 'error' && (
                          <div style={{
                            fontSize: "0.75rem",
                            color: "#ef4444",
                            marginTop: "0.5rem"
                          }}>
                            {file.error || "An error occurred while processing the file."}
                          </div>
                        )}
                        
                        {(file.status === 'processed' || file.status === 'uploaded' || file.status === 'complete') && (
                          <div style={{ 
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: "0.5rem"
                          }}>
                            <button style={{
                              padding: "0.25rem 0.5rem",
                              border: "1px solid #d1d5db",
                              borderRadius: "0.375rem",
                              backgroundColor: "white",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "#374151",
                              cursor: "pointer"
                            }}>
                              View
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={{
          borderTop: "1px solid #e0e0e0",
          padding: "1rem",
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "white",
              cursor: "pointer"
            }}
          >
            Close
          </button>
          
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "white",
              backgroundColor: "#3b82f6",
              cursor: "pointer"
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;