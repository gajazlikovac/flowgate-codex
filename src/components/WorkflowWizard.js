import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from "react-router-dom";
import { useOthers, useMyPresence } from '../liveblocks';
import { useAuth0 } from '@auth0/auth0-react';
import FileUploadService from '../services/FileUploadService';
import { useTaskGoalIntegration } from '../context/TaskGoalContext';


// Add global styles for animations 
const globalStyles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Utility function to clear cached answers
const clearCachedAnswers = () => {
    try {
        localStorage.removeItem('workflow_answers');
        console.log('Cleared cached answers from localStorage');
    } catch (error) {
        console.error('Error clearing cached answers:', error);
    }
};

// Utility function to sanitize answers
const sanitizeAnswers = (answers) => {
    if (!answers || typeof answers !== 'object') {
        console.warn('Invalid answers data received:', answers);
        return {};
    }

    const sanitized = {};
    
    Object.entries(answers).forEach(([key, value]) => {
        // Skip invalid entries
        if (!key || !value) return;
        
        // Ensure the answer has the required structure
        if (typeof value === 'object' && value.response) {
            // Sanitize the response text
            console.log(`[DEBUG] Sanitizing value: ${JSON.stringify(value)}`);
            const sanitizedResponse = typeof value.response === 'string'
                ? value.response.trim() + '\n\n' + (value.citation_filename
                    ? `Citation: ${value.citation_filename}`
                    : '')
                : String(value.response).trim() + '\n\n';
            
            // Only include if response has content
            if (sanitizedResponse.length > 0) {
                console.log(`[DEBUG] Sanitizing answer : ${sanitizedResponse}`);
                sanitized[key] = {
                    ...value,
                    response: sanitizedResponse,
                    timestamp: value.timestamp || new Date().toISOString()
                };
            }
        }
    });
    
    return sanitized;
};

// Debug and repair panel component
const DebugRepairPanel = ({ answers, questions, setAnswers }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [repairStatus, setRepairStatus] = useState(null);

    const handleRepair = () => {
        try {
            // Create a backup of current answers
            const backup = { ...answers };
            localStorage.setItem('workflow_answers_backup', JSON.stringify(backup));
            
            // Repair process
            const repaired = sanitizeAnswers(answers);
            setAnswers(repaired);
            
            setRepairStatus({
                type: 'success',
                message: 'Answers repaired successfully. Backup created.'
            });
        } catch (error) {
            setRepairStatus({
                type: 'error',
                message: `Repair failed: ${error.message}`
            });
        }
    };

    const handleRestore = () => {
        try {
            const backup = localStorage.getItem('workflow_answers_backup');
            if (backup) {
                setAnswers(JSON.parse(backup));
                setRepairStatus({
                    type: 'success',
                    message: 'Backup restored successfully'
                });
            } else {
                setRepairStatus({
                    type: 'error',
                    message: 'No backup found'
                });
            }
        } catch (error) {
            setRepairStatus({
                type: 'error',
                message: `Restore failed: ${error.message}`
            });
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    padding: '8px 16px',
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                }}
            >
                Debug Panel
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '300px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '16px',
            zIndex: 1000
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Debug Panel</h3>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#6B7280',
                        cursor: 'pointer',
                        fontSize: '20px'
                    }}
                >
                    ×
                </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4B5563' }}>
                    Total Questions: {questions.length}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4B5563' }}>
                    Answered Questions: {Object.keys(answers).length}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                    onClick={handleRepair}
                    style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Repair Data
                </button>
                <button
                    onClick={handleRestore}
                    style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: '#6B7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Restore Backup
                </button>
            </div>

            {repairStatus && (
                <div style={{
                    padding: '8px',
                    backgroundColor: repairStatus.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                    color: repairStatus.type === 'success' ? '#065F46' : '#991B1B',
                    borderRadius: '6px',
                    fontSize: '14px'
                }}>
                    {repairStatus.message}
                </div>
            )}
        </div>
    );
};

// Simple DocumentModal without Tailwind dependencies
const DocumentModal = ({ isOpen, onClose, onSelect }) => {
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
        const intervals = progressIntervals.current;
        return () => {
            Object.values(intervals).forEach(interval => {
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
                throw new Error(`Total size of ${FileUploadService.formatFileSize(totalSize)} exceeds the maximum of ${FileUploadService.formatFileSize(MAX_TOTAL_SIZE)}`);
            }
            
            // Process each file
            const uploadPromises = [];
            
            for (const file of Array.from(files)) {
                try {
                    // Validate file type
                    if (!FileUploadService.isSupportedFileType(file.type)) {
                        console.warn(`Skipping unsupported file: ${file.name} (${file.type})`);
                        continue;
                    }
                    
                    // Validate individual file size
                    if (file.size > FileUploadService.maxFileSize) {
                        console.warn(`Skipping file that exceeds maximum size: ${file.name} (${FileUploadService.formatFileSize(file.size)})`);
                        continue;
                    }
                    
                    // Process the file
                    const processPromise = FileUploadService.processFile(file, {
                        sourceComponent: 'documentModal',
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
                            const fileInfo = FileUploadService.getFileDisplayInfo(processedFile.id);
                            
                            setUploadProgress(prev => ({
                                ...prev,
                                [processedFile.id]: fileInfo
                            }));
                            
                            // If file is fully processed or error occurred, clear the interval
                            if (['processed', 'uploaded', 'complete', 'error'].includes(fileInfo.status)) {
                                clearInterval(progressIntervals.current[processedFile.id]);
                                delete progressIntervals.current[processedFile.id];
                                
                                // If successful, select the file
                                if (['processed', 'uploaded', 'complete'].includes(fileInfo.status)) {
                                    onSelect(fileInfo.name);
                                    onClose();
                                }
                            }
                        }, 500);
                    });
                } catch (fileError) {
                    console.error(`Error processing file ${file.name}:`, fileError);
                    // Continue with other files
                }
            }
            
            // Wait for all uploads to complete
            await Promise.all(uploadPromises);
            
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
    }, [onSelect, onClose]);
    
    // Handle file drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [handleFileSelect]);
    
    // Handle file input change
    const handleFileInputChange = useCallback((e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files);
        }
    }, [handleFileSelect]);
    
    // Handle remote PDF upload
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
            
            // Upload remote PDF
            const processedFile = await FileUploadService.uploadRemotePDF(remoteUrl, displayName, {
                sourceComponent: 'documentModal'
            });
            
            // Track progress
            const fileId = processedFile.name || `remote_${Date.now()}`;
            
            // Set up interval to track progress
            progressIntervals.current[fileId] = setInterval(() => {
                const fileInfo = FileUploadService.getFileDisplayInfo(fileId);
                
                if (fileInfo) {
                    setUploadProgress(prev => ({
                        ...prev,
                        [fileId]: fileInfo
                    }));
                    
                    // If file is fully processed or error occurred, clear the interval
                    if (['processed', 'uploaded', 'complete', 'error'].includes(fileInfo.status)) {
                        clearInterval(progressIntervals.current[fileId]);
                        delete progressIntervals.current[fileId];
                        
                        // If successful, select the file
                        if (['processed', 'uploaded', 'complete'].includes(fileInfo.status)) {
                            onSelect(fileInfo.name);
                            onClose();
                        }
                    }
                }
            }, 500);
            
            // Clear form
            setRemoteUrl('');
            setDisplayName('');
        } catch (error) {
            console.error("Remote PDF upload error:", error);
            setUploadError(`Remote PDF upload error: ${error.message}`);
        } finally {
            setUploading(false);
        }
    }, [remoteUrl, displayName, onSelect, onClose]);

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
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '80%',
                maxWidth: '800px',
                padding: '24px',
                position: 'relative',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>Select Evidence Document</h3>
                <button 
                    onClick={onClose}
                    style={{
                        background: 'none',
                            border: 'none',
                            color: '#9CA3AF',
                        cursor: 'pointer',
                            fontSize: '24px'
                    }}
                >
                    ✕
                </button>
                </div>

                <div style={{ 
                    display: 'flex', 
                    borderBottom: '1px solid #E5E7EB',
                    marginBottom: '16px'
                }}>
                    <button 
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: activeTab === 'upload' ? '#4F46E5' : '#6B7280',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'upload' ? '2px solid #4F46E5' : '2px solid transparent',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('upload')}
                    >
                        Upload New
                    </button>
                    <button 
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: activeTab === 'existing' ? '#4F46E5' : '#6B7280',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'existing' ? '2px solid #4F46E5' : '2px solid transparent',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('existing')}
                    >
                        Existing Documents
                    </button>
                </div>

                {activeTab === 'upload' && (
                    <div>
                        <div 
                            style={{
                                border: '2px dashed #E5E7EB',
                                borderRadius: '8px',
                                padding: '32px',
                                textAlign: 'center',
                                backgroundColor: dragActive ? '#F3F4F6' : 'white',
                                marginBottom: '16px'
                            }}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileInputChange}
                                style={{ display: 'none' }}
                            />
                            <div style={{ marginBottom: '16px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6B7280' }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                            </div>
                            <p style={{ color: '#6B7280', marginBottom: '8px' }}>
                                Drag and drop files here, or{' '}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#4F46E5',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: 'inherit'
                                    }}
                                >
                                    browse
                                </button>
                            </p>
                            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                                Supported file types: PDF, Word, Excel, CSV, Images, and text files
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
                                Or upload from URL
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    type="text"
                                    value={remoteUrl}
                                    onChange={(e) => setRemoteUrl(e.target.value)}
                                    placeholder="Enter PDF URL"
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Display name"
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                />
                                <button
                                    onClick={handleRemotePDFUpload}
                                    disabled={uploading}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: uploading ? '#E5E7EB' : '#4F46E5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}
                                >
                                    Upload
                                </button>
                            </div>
                        </div>

                        {uploadError && (
                    <div style={{ 
                                backgroundColor: '#FEE2E2',
                                border: '1px solid #FECACA',
                                borderRadius: '6px',
                                padding: '12px',
                                marginBottom: '16px',
                                color: '#991B1B'
                            }}>
                                {uploadError}
                    </div>
                        )}

                        {Object.entries(uploadProgress).length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
                                    Upload Progress
                                </h4>
                                {Object.entries(uploadProgress).map(([fileId, fileInfo]) => (
                                    <div
                                        key={fileId}
                                        style={{
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            marginBottom: '8px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '14px', color: '#111827' }}>{fileInfo.name}</span>
                                            <span style={{
                                                fontSize: '12px',
                                                padding: '2px 8px',
                                                borderRadius: '9999px',
                                                backgroundColor: fileInfo.status === 'error' ? '#FEE2E2' :
                                                             fileInfo.status === 'complete' ? '#D1FAE5' :
                                                             '#DBEAFE',
                                                color: fileInfo.status === 'error' ? '#991B1B' :
                                                       fileInfo.status === 'complete' ? '#065F46' :
                                                       '#1E40AF'
                                            }}>
                                                {fileInfo.status}
                                            </span>
                                        </div>
                                        {fileInfo.status === 'error' && fileInfo.error && (
                                            <p style={{ fontSize: '12px', color: '#991B1B', margin: '4px 0 0 0' }}>
                                                {fileInfo.error}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'existing' && (
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        marginBottom: '16px'
                    }}>
                        <div style={{ marginBottom: '8px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                                padding: '12px',
                                backgroundColor: '#EBF8FF',
                                border: '1px solid #BEE3F8',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}>
                                <div style={{ 
                                    color: '#3182CE',
                                    marginRight: '12px',
                                    fontSize: '24px'
                                }}>
                                    📄
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ 
                                        fontWeight: '500',
                                        color: '#1A202C',
                                        margin: 0
                                    }}>
                                        DCIM Dashboard - May 2025.pdf
                                    </h4>
                                    <p style={{ 
                                        fontSize: '14px', 
                                        color: '#718096',
                                        margin: 0 
                                    }}>
                                        1.2 MB - Updated 3 days ago
                                    </p>
                    </div>
                    <div style={{ 
                                    color: '#3182CE',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    <span style={{ 
                                        backgroundColor: '#BEE3F8',
                                        borderRadius: '9999px',
                                        padding: '2px 8px'
                                    }}>
                                        98% match
                                    </span>
                    </div>
                </div>
                        </div>
                    </div>
                )}

                <div style={{
                    borderTop: '1px solid #E5E7EB',
                    paddingTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <button 
                        onClick={onClose} 
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#4B5563',
                            backgroundColor: 'white',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// Template modal component with inline styles
const TemplateModal = ({ isOpen, onClose }) => {
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
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '80%',
                maxWidth: '800px',
                padding: '24px',
                position: 'relative',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>Available Templates</h3>
                <button 
                    onClick={onClose}
                    style={{
                        background: 'none',
                            border: 'none',
                            color: '#9CA3AF',
                        cursor: 'pointer',
                            fontSize: '24px'
                    }}
                >
                    ✕
                </button>
                </div>

                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                    Download these templates to help with your compliance documentation:
                </p>

                <div style={{ 
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: '16px'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '12px',
                            backgroundColor: '#EBF8FF',
                            border: '1px solid #BEE3F8',
                            borderRadius: '6px'
                        }}>
                    <div style={{ 
                                color: '#3182CE',
                                marginRight: '12px',
                                fontSize: '24px'
                            }}>
                                📊
                            </div>
                        <div style={{ flex: 1 }}>
                                <h4 style={{ 
                                    fontWeight: '500',
                                    color: '#1A202C',
                                    margin: 0
                                }}>
                                    Energy Consumption Documentation Template
                                </h4>
                                <p style={{ 
                                    fontSize: '14px', 
                                    color: '#718096',
                                    margin: 0 
                                }}>
                                    Excel template for tracking monthly energy metrics across data centers
                                </p>
                        </div>
                        <button style={{
                            padding: '6px 12px',
                                backgroundColor: '#BEE3F8',
                                color: '#3182CE',
                                border: '1px solid #90CDF4',
                            borderRadius: '4px',
                            cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '14px'
                        }}>
                            Download
                        </button>
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '12px',
                            backgroundColor: 'white',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px'
                        }}>
                            <div style={{ 
                                color: '#3182CE',
                                marginRight: '12px',
                                fontSize: '24px'
                            }}>
                                📝
                            </div>
                        <div style={{ flex: 1 }}>
                                <h4 style={{ 
                                    fontWeight: '500',
                                    color: '#1A202C',
                                    margin: 0
                                }}>
                                    Quarterly Reporting Template
                                </h4>
                                <p style={{ 
                                    fontSize: '14px', 
                                    color: '#718096',
                                    margin: 0 
                                }}>
                                    Standardized format for Article 11 compliance reporting
                                </p>
                        </div>
                        <button style={{
                            padding: '6px 12px',
                                backgroundColor: '#BEE3F8',
                                color: '#3182CE',
                                border: '1px solid #90CDF4',
                            borderRadius: '4px',
                            cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '14px'
                        }}>
                            Download
                        </button>
                        </div>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid #E5E7EB',
                    paddingTop: '16px',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button 
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'white',
                            backgroundColor: '#718096',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
// QuestionItem component with parameterized values instead of hardcoded ones
const QuestionItem = ({ 
    id = 1, 
    title, 
    status, 
    question, 
    simplifiedQuestion, 
    recommendation, 
    recommendationTitle, 
    rag_answer, 
    valDefinition, 
    questionsBeingViewed, 
    stepSection = "Data Centre Information and Management (Step 0)",
    priority = "High",
    expertTip = "Focus on demonstrating that your documentation is actively used and updated, not just created and forgotten. Auditors will look for evidence that the information informs actual operational decisions.",
    whatThisMeans = "You need a central system where you document and maintain basic information about your data center - like its layout, power systems, cooling infrastructure, and IT equipment. This information should be organized, regularly updated, and accessible to staff who need it.",
    complianceRequires = "- Documentation of physical characteristics (location, size, floor plans)\n- Records of power capacity and actual consumption\n- Inventory of cooling infrastructure with specifications\n- IT equipment inventory with power profiles\n- Regular update process with change management\n- Centralized access for relevant stakeholders",
    verificationMethods = "Document Review, Management Interview, Implementation Check. Auditors will review documentation, interview management, and verify implementation.",
    majorNonconformity = "Missing formal determination of context - absence of documented analysis of relevant issues",
    minorNonconformity = "Incomplete documentation or irregular reviews - partial analysis or outdated information",
    sampleResponseTemplate = "We maintain comprehensive data center information through our [SYSTEM NAME] platform and formal documentation process. Key characteristics including [LIST 3-4 SPECIFIC PARAMETERS] are documented in our [REPORT NAME]. Our centralized repository includes [LIST 2-3 DOCUMENT TYPES] which are updated [FREQUENCY] through our [PROCESS NAME].",
    humanInputExample = "We maintain comprehensive data center information through our DCIM platform and formal documentation process. Key characteristics including location, size, power capacity, cooling infrastructure, IT load, and PUE are documented in our quarterly reports (see Q1-2024 DC Operations Report). Our centralized repository includes detailed floor plans, equipment inventories, and operational parameters which are updated monthly through our change management process.",
    recommendedEvidence = "- Screenshot of your data center information system\n- Sample page from recent documentation showing key metrics\n- Change management process document showing how information is updated\n- Access control list showing who can view/modify documentation",
    recommendedActions = "- Create cross-functional approval board with representatives from all disciplines\n- Require approval from this group for significant decisions\n- Ensure impacts of decisions are properly understood across departments\n- Use the group as equivalent to a change board for major decisions",
    acceptedFileTypes = "pdf, xls, docx",
    documentDescriptor = "Mandatory: Completed Data Centre Information section",
    docRequired = "Yes",
    badExampleAnswer = "We have information about our data centers. The IT team keeps track of the servers and the facilities team monitors the building systems. We can provide this information when requested.",
    badExampleFeedback = "This response is too vague, lacks specific details about systems and processes, and doesn't demonstrate proper documentation practices required by the standard.",
    onSave,
    savedAnswer // Add the new prop here
}) => {
    const [isOpen, setIsOpen] = useState(false);
    // Initialize answer with saved answer if available, otherwise empty string
    const [answer, setAnswer] = useState(savedAnswer?.response || '');
    // Initialize selectedEvidence with saved evidence filename if available
    const [selectedEvidence, setSelectedEvidence] = useState(savedAnswer?.evidence_filename || null);
    const [activeTab, setActiveTab] = useState('Question Details');
    // Determine initial isLlmResponse based on whether a saved answer exists
    const [isLlmResponse, setIsLlmResponse] = useState(!savedAnswer || savedAnswer.source === 'llm'); // Assuming source 'llm' means AI-generated
    const [documentModalOpen, setDocumentModalOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [, updateMyPresence] = useMyPresence();
    // Use the provided simplifiedQuestion or truncate from full question if not provided
    const displaySimplifiedQuestion = simplifiedQuestion || (question.length > 80 
        ? `${question.substring(0, 77)}...` 
        : question);
    
    // Determine conformity status using useMemo
    const conformityStatus = React.useMemo(() => {
        if (!answer) return 'non-conformant';
        if (answer.length > 200) return 'conformant';
        if (answer.length > 100) return 'partial';
        return 'non-conformant';
    }, [answer]);
    
    // Update presence when opening/closing question details
    useEffect(() => {
        // whenever we open, tell Liveblocks which question we're on
        if (isOpen) {
            updateMyPresence({ viewingQuestionId: title });
        } else {
            // when we close, clear it
            updateMyPresence({ viewingQuestionId: null });
        }
        // we only care about changes to `isOpen` (and `title`, if it can ever change)
    }, [isOpen, title, updateMyPresence]);
    
    // Log guidance props when they are set
    useEffect(() => {
        console.log(`QuestionItem ${id}: Guidance Props Updated - whatThisMeans: ${whatThisMeans ? 'Present' : 'Empty'}, complianceRequires: ${complianceRequires ? 'Present' : 'Empty'}, expertTip: ${expertTip ? 'Present' : 'Empty'}`);
    }, [id, whatThisMeans, complianceRequires, expertTip]);
    
    // Handle save logic
    const handleSave = () => {
        onSave(id, answer, selectedEvidence);
    };
    
    // Handle regenerate answer
    const handleRegenerate = () => {
        setIsLlmResponse(true);
        setAnswer(rag_answer || '');
    };

    // Function to apply a template or example
    const applyTemplate = (template) => {
        setAnswer(template);
        setIsLlmResponse(false); // User is applying a template/example, so it's not the original LLM response anymore
    };

    // Tab styling
    const getTabStyle = (tabName) => ({
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: activeTab === tabName ? '600' : '400',
        color: activeTab === tabName ? '#4F46E5' : '#6B7280',
        background: 'none',
        border: 'none',
        borderBottom: activeTab === tabName ? '2px solid #4F46E5' : '2px solid transparent',
        cursor: 'pointer',
        outline: 'none'
    });

    // Status badge styling
    const getStatusStyles = () => {
        let bgColor, textColor, borderColor;
        
        switch(conformityStatus) {
            case 'conformant':
                bgColor = '#D1FAE5';
                textColor = '#065F46';
                borderColor = '#A7F3D0';
                break;
            case 'non-conformant':
                bgColor = '#FEE2E2';
                textColor = '#991B1B';
                borderColor = '#FECACA';
                break;
            case 'partial':
                bgColor = '#FEF3C7';
                textColor = '#92400E';
                borderColor = '#FDE68A';
                break;
            default:
                bgColor = '#E5E7EB';
                textColor = '#374151';
                borderColor = '#D1D5DB';
        }
        
        return {
            badge: {
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: bgColor,
                color: textColor
            },
            textareaContainer: {
                position: 'relative',
                marginBottom: '12px' 
            },
            textarea: {
                    width: '100%', 
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                backgroundColor: bgColor.replace(')', ', 0.2)').replace('rgb', 'rgba'),
                minHeight: '120px',
                fontSize: '14px',
                resize: 'vertical',
                lineHeight: '1.5',
                color: '#374151'
            },
            inlineStatus: {
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '4px',
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            },
            notification: {
                marginTop: '8px',
                padding: '12px',
                backgroundColor: bgColor.replace(')', ', 0.3)').replace('rgb', 'rgba'),
                borderLeft: `4px solid ${borderColor}`,
                color: textColor,
                fontSize: '14px'
            }
        };
    };

    const styles = getStatusStyles();

    return (
        <>
            <DocumentModal 
                isOpen={documentModalOpen}
                onClose={() => setDocumentModalOpen(false)}
                onSelect={() => {
                    setSelectedEvidence("DCIM Dashboard - May 2025.pdf");
                    setDocumentModalOpen(false);
                }}
            />
            
            <TemplateModal
                isOpen={templateModalOpen}
                onClose={() => setTemplateModalOpen(false)}
            />
            
            <div style={{
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                marginBottom: '24px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Header - redesigned based on screenshot */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                    padding: '16px 24px',
                    backgroundColor: '#F9FAFB',
                    borderBottom: isOpen ? '1px solid #E5E7EB' : 'none'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#6B7280',
                                marginRight: '8px' 
                            }}>
                                Q{id}
                            </span>
                            <h3 style={{ 
                                fontSize: '18px', 
                                fontWeight: '600', 
                                color: '#111827',
                                margin: '0'
                            }}>
                                {title}
                            </h3>
                            
                            <span style={{
                                marginLeft: '12px',
                                padding: '2px 10px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: priority === 'High' ? '#FEE2E2' : 
                                                priority === 'Medium' ? '#FEF3C7' : 
                                                '#DBEAFE',
                                color: priority === 'High' ? '#991B1B' : 
                                        priority === 'Medium' ? '#92400E' : 
                                        '#1E40AF'
                            }}>
                                {priority} Priority
                            </span>
                        </div>
                        
                        <p style={{ 
                            margin: '0',
                            fontSize: '15px', 
                            color: '#4B5563'
                        }}>
                            {displaySimplifiedQuestion}
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* User viewing indicators */}
                        {questionsBeingViewed[title] && questionsBeingViewed[title].length > 0 && (
                            <div style={{ display: 'flex' }}>
                            {questionsBeingViewed[title].map((viewingUser, idx) => (
                                <div
                                    key={idx}
                                    title={`${viewingUser.name || viewingUser.email} is viewing this question`}
                                    style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: '#FF9800',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px',
                                            marginRight: '-8px',
                                            border: '2px solid white',
                                        zIndex: idx + 1,
                                            position: 'relative'
                                    }}
                                >
                                    {(viewingUser.name || viewingUser.email || "?").charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                        )}
                        
                        {/* Conformity Status Badge */}
                        <div style={styles.badge}>
                        {conformityStatus === 'conformant' && <span>✓</span>}
                        {conformityStatus === 'non-conformant' && <span>✗</span>}
                        {conformityStatus === 'partial' && <span>!</span>}
                        {conformityStatus === 'conformant' ? 'Conformant' : 
                         conformityStatus === 'non-conformant' ? 'Non-conformant' : 
                         'Partial'}
                        </div>
                        
                        {/* Toggle Button */}
                        <button 
                            onClick={() => setIsOpen(!isOpen)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: isOpen ? '#EBF5FF' : 'white',
                                color: isOpen ? '#1E40AF' : '#4B5563',
                                border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontWeight: '500',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                        {isOpen ? 'Close' : 'Open'}
                    </button>
                </div>
            </div>

                {/* Question Content - Only visible when open */}
            {isOpen && (
                    <div>
                    {/* Tab Navigation */}
                        <div style={{ 
                            borderBottom: '1px solid #E5E7EB'
                        }}>
                            <div style={{ display: 'flex' }}>
                                <button style={getTabStyle('Question Details')} onClick={() => setActiveTab('Question Details')}>
                                    Question Details
                            </button>
                                <button style={getTabStyle('Guidance')} onClick={() => setActiveTab('Guidance')}>
                                    Guidance
                            </button>
                                <button style={getTabStyle('Required Evidence')} onClick={() => setActiveTab('Required Evidence')}>
                                    Required Evidence
                                </button>
                                <button style={getTabStyle('Examples')} onClick={() => setActiveTab('Examples')}>
                                    Examples
                            </button>
                        </div>
                    </div>
                    
                        {/* Question Details Tab */}
                        {activeTab === 'Question Details' && (
                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        color: '#6B7280',
                                        marginBottom: '4px' 
                                    }}>
                                        Full Question:
                                    </h4>
                                    <p style={{ 
                                        fontSize: '15px', 
                                        color: '#1F2937',
                                        margin: '0' 
                                    }}>
                                        {question}
                                    </p>
                            </div>
                            
                                            <div style={{ 
                                    backgroundColor: '#F9FAFB',
                                    border: '1px solid #E5E7EB',
                                                borderRadius: '6px',
                                    padding: '16px',
                                    marginBottom: '24px'
                                }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{
                                            backgroundColor: '#DBEAFE',
                                            color: '#1E40AF',
                                            padding: '2px 10px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            marginRight: '8px'
                                        }}>
                                            Reference
                                            </div>
                                        <h4 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '600', 
                                            color: '#4B5563',
                                            margin: '0' 
                                        }}>
                                            {title}
                                        </h4>
                                    </div>
                                    <div style={{ 
                                        fontSize: '14px', 
                                        color: '#6B7280' 
                                    }}>
                                        <p style={{ margin: '0 0 4px 0' }}>Step/Section: {stepSection}</p>
                                        <p style={{ margin: '0' }}>Recommendation: {recommendationTitle || 'Group Involvement'}</p>
                                        <p style={{ margin: '4px 0 0 0' }}>Verification Methods: {verificationMethods}</p>
                                    </div>
                                </div>
                                
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        marginBottom: '4px'
                                    }}>
                                        <h4 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#6B7280',
                                            margin: '0' 
                                        }}>
                                            Your Answer:
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {isLlmResponse && answer && (
                                        <span style={{
                                                    display: 'inline-block',
                                            padding: '2px 8px',
                                                    backgroundColor: '#E0E7FF',
                                                    color: '#4F46E5',
                                            borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    marginRight: '8px'
                                                }}>
                                                    AI-generated
                                                </span>
                                    )}
                                    {!isLlmResponse && answer && (
                                        <span style={{
                                                    display: 'inline-block',
                                            padding: '2px 8px',
                                                    backgroundColor: '#D1FAE5',
                                                    color: '#065F46',
                                            borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    marginRight: '8px'
                                                }}>
                                                    User-edited
                                                </span>
                                            )}
                                            <div 
                                                style={{ position: 'relative' }}
                                                onMouseEnter={() => setTooltipVisible(true)}
                                                onMouseLeave={() => setTooltipVisible(false)}
                                            >
                                                <button style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#4F46E5',
                                                    cursor: 'help',
                                                    padding: '0',
                                                    fontSize: '20px',
                                                    lineHeight: '1',
                                                    display: 'flex'
                                                }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                
                                                {tooltipVisible && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        zIndex: '10',
                                                        width: '256px',
                                                        right: '0',
                                                        top: '100%',
                                                        marginTop: '8px',
                                                        padding: '8px 12px',
                                                        backgroundColor: '#1F2937',
                                                        color: 'white',
                                                        fontSize: '12px',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                                    }}>
                                                        <p style={{ fontWeight: '500', marginTop: '0', marginBottom: '4px' }}>
                                                            You can modify this AI-generated response in any way:
                                                        </p>
                                                        <ul style={{ 
                                                            listStyleType: 'disc',
                                                            paddingLeft: '16px',
                                                            margin: '0'
                                                        }}>
                                                            <li>Edit the text to match your specific implementation</li>
                                                            <li>Add specific details about your processes</li>
                                                            <li>Remove irrelevant sections</li>
                                                            <li>Reference your specific evidence documents</li>
                                                        </ul>
                                </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={styles.textareaContainer}>
                                    <textarea
                                        value={answer}
                                        onChange={(e) => {
                                            setAnswer(e.target.value);
                                            setIsLlmResponse(false);
                                        }}
                                        placeholder="Enter your response here..."
                                            style={styles.textarea}
                                            rows={6}
                                        />
                                        
                                    {conformityStatus && (
                                            <div style={styles.inlineStatus}>
                                            {conformityStatus === 'conformant' && <span>✓</span>}
                                            {conformityStatus === 'non-conformant' && <span>✗</span>}
                                            {conformityStatus === 'partial' && <span>!</span>}
                                            {conformityStatus === 'conformant' ? 'Meets requirements' : 
                                            conformityStatus === 'non-conformant' ? 'Does not meet requirements' : 
                                                '! Partially meets requirements'}
                                        </div>
                                    )}
                                </div>
                                    
                                    {/* Conformity warning/guidance message */}
                                {conformityStatus === 'non-conformant' && (
                                        <div style={styles.notification}>
                                            <strong>Non-conformance issue:</strong> Response does not address all required elements. Be sure to include details about your data center documentation system, update frequency, and who maintains it.
                                    </div>
                                )}
                                    
                                {conformityStatus === 'partial' && (
                                        <div style={styles.notification}>
                                            <strong>Improvement needed:</strong> Your response needs more specific details about how information is maintained and updated. Consider adding examples of your documentation.
                                    </div>
                                )}
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        marginTop: '12px' 
                                    }}>
                                        <button 
                                            onClick={handleRegenerate}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: 'none',
                                                border: 'none',
                                                color: '#4F46E5',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                padding: '0'
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                            </svg>
                                            Regenerate Response
                                        </button>
                                        
                                        <div style={{ 
                                                display: 'flex',
                                                alignItems: 'center',
                                            gap: '8px' 
                                        }}>
                                            <span style={{ 
                                                fontSize: '14px', 
                                                color: '#6B7280' 
                                            }}>
                                                Feedback:
                                            </span>
                                            <button 
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#9CA3AF',
                                                    fontSize: '18px',
                                                    cursor: 'pointer',
                                                    padding: '0'
                                                }}
                                                title="Helpful response"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                </svg>
                                        </button>
                                            <button 
                                                style={{
                                            background: 'none',
                                            border: 'none',
                                                    color: '#9CA3AF',
                                                    fontSize: '18px',
                                                    cursor: 'pointer',
                                                    padding: '0'
                                                }}
                                                title="Not helpful response"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                                </svg>
                                            </button>
                                    </div>
                                </div>
                            </div>

                                {/* Evidence Selection and Save Section */}
                                                            <div style={{ 
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                    alignItems: 'flex-end',
                                                                    marginTop: '24px',
                                                                    paddingTop: '16px',
                                                                    borderTop: '1px solid #E5E7EB'
                                                            }}>
                                                                    <div>
                                                                        <h4 style={{ 
                                                                            fontSize: '14px', 
                                                                            fontWeight: '500', 
                                                                            color: '#4B5563',
                                                                            marginBottom: '8px',
                                                                            display: 'flex',
                                                                            alignItems: 'center'
                                                                        }}>
                                                                            Attach Evidence
                                                                            <span style={{
                                                                            display: 'inline-block',
                                                                                marginLeft: '8px',
                                                                                color: '#DC2626',
                                                                                fontSize: '12px',
                                                                                fontWeight: '600'
                                                                            }}>
                                                                                {docRequired === "Yes" ? "Required" : "Optional"}
                                                                            </span>
                                                                        </h4>
                                                                        
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', 
                                                                            width: '100%' }}>
                                                                            
                                                                            <button 
                                                                                onClick={() => setDocumentModalOpen(true)}
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    padding: '8px 16px',
                                                                                    border: '1px solid #D1D5DB',
                                                                                    backgroundColor: 'white',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '14px',
                                                                                    fontWeight: '500',
                                                                                    color: '#4B5563',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '8px' }}>
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                                </svg>
                                                                                {selectedEvidence ? selectedEvidence : 'Select Document'}
                                                                            </button>
                                                                            
                                                                            
                                                                            
                                                                        </div>
                                                                        
                                                                        <div style={{ 
                                                                            display: 'flex', 
                                                                            gap: '4px',
                                                                            marginTop: '4px' 
                                                                        }}>
                                                                            {acceptedFileTypes.split(',').map((type, index) => (
                                                                                <span 
                                                                                    key={index} 
                                                                                    style={{
                                                                                        padding: '2px 8px',
                                                                                        backgroundColor: '#DBEAFE',
                                                                                        color: '#1E40AF',
                                                                                        borderRadius: '4px',
                                                                                        fontSize: '12px',
                                                                                        fontWeight: '500'
                                                                                    }}
                                                                                >
                                                                                    {type.trim()}
                                                                                </span>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <WorklfowTaskCreation />
                                                                    <button
                                                                        onClick={handleSave}
                                                                        style={{
                                                                                padding: '8px 16px',
                                                                                backgroundColor: '#4F46E5',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                                borderRadius: '6px',
                                                                                fontSize: '14px',
                                                                                fontWeight: '500',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            Save Answer
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Guidance Tab */}
                        {activeTab === 'Guidance' && (
                            <div style={{ padding: '24px' }}>
                                {/* What This Means section - Render only if whatThisMeans is not empty after trimming */}
                                {whatThisMeans && whatThisMeans.trim() && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h4 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#111827',
                                            marginBottom: '8px' 
                                        }}>
                                            What This Means
                                        </h4>
                                        <div style={{ 
                                            backgroundColor: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            padding: '16px'
                                        }}>
                                            <p style={{ 
                                                margin: '0',
                                                color: '#4B5563' 
                                            }}>
                                                {whatThisMeans}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Compliance Requirements section - Render only if complianceRequires is not empty after trimming */}
                                {complianceRequires && complianceRequires.trim() && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h4 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#111827',
                                            marginBottom: '8px' 
                                        }}>
                                            Compliance Requirements
                                        </h4>
                                        <div style={{ 
                                            backgroundColor: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '6px',
                                            padding: '16px'
                                        }}>
                                            <ul style={{ 
                                                listStyleType: 'disc',
                                                paddingLeft: '20px',
                                                margin: '0', 
                                                color: '#4B5563'
                                            }}>
                                                {complianceRequires.split('\n').map((item, index) => (
                                                    <li key={index} style={{ marginBottom: '4px' }}>
                                                        {item.replace(/^- /, '')}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Expert Tip section - Render only if expertTip is not empty after trimming */}
                                {expertTip && expertTip.trim() && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h4 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#111827',
                                            marginBottom: '8px' 
                                        }}>
                                            Expert Tip
                                        </h4>
                                        <div style={{ 
                                            backgroundColor: '#EEF2FF',
                                            border: '1px solid #C7D2FE',
                                            borderRadius: '6px',
                                            padding: '16px'
                                        }}>
                                            <div style={{ display: 'flex' }}>
                                                <div style={{ 
                                                    flexShrink: '0',
                                                    color: '#4F46E5',
                                                    marginRight: '12px' 
                                                }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <p style={{ 
                                                    margin: '0',
                                                    color: '#3730A3' 
                                                }}>
                                                    {expertTip}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Non-Conformity Information section - Render if either major or minor nonconformity is present after trimming */}
                                {((majorNonconformity && majorNonconformity.trim()) || (minorNonconformity && minorNonconformity.trim())) && (
                                    <div>
                                        <h4 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#111827',
                                            marginBottom: '8px' 
                                        }}>
                                            Non-Conformity Information
                                        </h4>
                                        <div style={{ 
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '16px'
                                        }}>
                                            {/* Major Non-Conformity - Render only if majorNonconformity is not empty after trimming */}
                                            {majorNonconformity && majorNonconformity.trim() && (
                                                <div style={{ 
                                                    backgroundColor: '#FEE2E2',
                                                    border: '1px solid #FECACA',
                                                    borderRadius: '6px',
                                                    padding: '16px'
                                                }}>
                                                    <h5 style={{ 
                                                        fontSize: '14px', 
                                                        fontWeight: '500', 
                                                        color: '#991B1B',
                                                        marginTop: '0',
                                                        marginBottom: '4px' 
                                                    }}>
                                                        Major Non-Conformity:
                                                    </h5>
                                                    <p style={{ 
                                                        fontSize: '14px',
                                                        margin: '0',
                                                        color: '#B91C1C' 
                                                    }}>
                                                        {majorNonconformity}
                                                    </p>
                                                </div>
                                            )}
                                            {/* Minor Non-Conformity - Render only if minorNonconformity is not empty after trimming */}
                                            {minorNonconformity && minorNonconformity.trim() && (
                                                <div style={{ 
                                                    backgroundColor: '#FEF3C7',
                                                    border: '1px solid #FDE68A',
                                                    borderRadius: '6px',
                                                    padding: '16px'
                                                }}>
                                                    <h5 style={{ 
                                                        fontSize: '14px', 
                                                        fontWeight: '500', 
                                                        color: '#92400E',
                                                        marginTop: '0',
                                                        marginBottom: '4px' 
                                                    }}>
                                                        Minor Non-Conformity:
                                                    </h5>
                                                    <p style={{ 
                                                        fontSize: '14px',
                                                        margin: '0',
                                                        color: '#B45309' 
                                                    }}>
                                                        {minorNonconformity}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Required Evidence Tab */}
                        {activeTab === 'Required Evidence' && (
                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        color: '#111827',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        Document Requirements
                                        <span style={{
                                            display: 'inline-block',
                                            marginLeft: '8px',
                                            padding: '2px 8px',
                                            backgroundColor: '#FEE2E2',
                                            color: '#991B1B',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            borderRadius: '4px'
                                        }}>
                                            {docRequired === "Yes" ? "Documentation Required" : "Optional Documentation"}
                                        </span>
                                    </h4>
                                    
                                    <div style={{ 
                                        backgroundColor: '#F9FAFB',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        padding: '16px',
                                        marginBottom: '16px'
                                    }}>
                                        <h5 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#4B5563',
                                            marginTop: '0',
                                            marginBottom: '8px' 
                                        }}>
                                            Document Descriptor:
                                        </h5>
                                        <p style={{ 
                                            margin: '0 0 16px 0',
                                            color: '#4B5563' 
                                        }}>
                                            {documentDescriptor}
                                        </p>
                                        
                                        <h5 style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#4B5563',
                                            marginTop: '16px',
                                            marginBottom: '8px' 
                                        }}>
                                            Accepted File Types:
                                        </h5>
                                <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap',
                                            gap: '8px' 
                                        }}>
                                            {acceptedFileTypes.split(',').map((type, index) => (
                                                <span 
                                                    key={index} 
                                                    style={{
                                                        padding: '2px 10px',
                                                        backgroundColor: '#DBEAFE',
                                                        color: '#1E40AF',
                                    borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    {type.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        color: '#111827',
                                        marginBottom: '12px' 
                                    }}>
                                        Recommended Evidence
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {recommendedEvidence.split('\n').map((item, index) => {
                                            const evidence = item.replace(/^- /, '');
                                            return (
                                                <div 
                                                    key={index}
                                                    style={{
                                                        display: 'flex',
                                                        padding: '12px',
                                                        backgroundColor: 'white',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '6px'
                                                    }}
                                                >
                                                    <div style={{ 
                                                        color: '#4F46E5',
                                                        marginRight: '12px' 
                                                    }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div style={{ flex: '1' }}>
                                                        <p style={{ 
                                                            margin: '0',
                                                            color: '#111827' 
                                                        }}>
                                                            {evidence}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setDocumentModalOpen(true)}
                                                        style={{
                                                            marginLeft: '8px',
                                                            color: '#4F46E5',
                                                            fontWeight: '500',
                                                            fontSize: '14px',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Choose
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        color: '#111827',
                                        marginBottom: '12px' 
                                    }}>
                                        Recommended Actions
                                    </h4>
                                    <div style={{ 
                                        backgroundColor: '#ECFDF5',
                                        border: '1px solid #A7F3D0',
                                        borderRadius: '6px',
                                        padding: '16px'
                                    }}>
                                        <ul style={{ 
                                            margin: '0',
                                            padding: '0',
                                            listStyle: 'none'
                                        }}>
                                            {recommendedActions.split('\n').map((item, index) => {
                                                const action = item.replace(/^- /, '');
                                                return (
                                                    <li 
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            marginBottom: index === recommendedActions.split('\n').length - 1 ? '0' : '8px'
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ 
                                                            color: '#059669',
                                                            marginRight: '8px',
                                                            flexShrink: '0',
                                                            marginTop: '2px'
                                                        }}>
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        <span style={{ color: '#065F46' }}>{action}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Examples Tab */}
                        {activeTab === 'Examples' && (
                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        color: '#111827',
                                        marginBottom: '8px' 
                                    }}>
                                        Response Template
                                    </h4>
                                    <div style={{ 
                                        backgroundColor: '#F9FAFB',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        padding: '16px'
                                    }}>
                                        <p style={{ 
                                            margin: '0',
                                            color: '#4B5563',
                                            whiteSpace: 'pre-line'
                                        }}>
                                            {sampleResponseTemplate}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            applyTemplate(sampleResponseTemplate);
                                            setIsLlmResponse(false); // Mark as user-edited since they're using a template
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginTop: '8px',
                                            color: '#4F46E5',
                                            fontSize: '14px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ marginRight: '4px' }}>
                                            <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                            <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                                        </svg>
                                        Use Template
                                    </button>
                                </div>
                                
                                <div style={{ 
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '24px',
                                    marginBottom: '24px'
                                }}>
                                    <div>
                                        <h4 style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#111827',
                                            marginBottom: '8px' 
                                        }}>
                                            <span style={{ 
                                                color: '#059669',
                                                marginRight: '8px'
                                            }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                            Good Example (Human Input)
                                        </h4>
                                        <div style={{ 
                                            backgroundColor: 'white',
                                            border: '1px solid #A7F3D0',
                                            borderRadius: '6px',
                                            padding: '16px'
                                        }}>
                                            <p style={{ 
                                                margin: '0',
                                                color: '#4B5563' 
                                            }}>
                                                {humanInputExample}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => applyTemplate(humanInputExample)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                marginTop: '8px',
                                                color: '#059669',
                                                fontSize: '14px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0'
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ marginRight: '4px' }}>
                                                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                                            </svg>
                                            Use This Example
                                    </button>
                                </div>
                                    
                                    <div>
                                        <h4 style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '14px', 
                                            fontWeight: '500', 
                                            color: '#111827',
                                            marginBottom: '8px' 
                                        }}>
                                            <span style={{ 
                                                color: '#4F46E5',
                                                marginRight: '8px'
                                            }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                            Good Example (AI-Generated with Citation)
                                        </h4>
                                        <div style={{ 
                                            backgroundColor: 'white',
                                            border: '1px solid #C7D2FE',
                                            borderRadius: '6px',
                                            padding: '16px'
                                        }}>
                                            <p style={{ 
                                                margin: '0',
                                                color: '#4B5563',
                                                whiteSpace: 'pre-line'
                                            }}>
                                                {rag_answer || "Yes, accurate data on data center characteristics and operations is available and maintained in accordance with EU Code of Conduct Section 3.1.1 requirements.\n\nCITATIONS\n2024 Infrastructure Documentation v2.3, Page 12\n\"Our data center information management system maintains real-time and historical data across all operational parameters including power consumption, cooling efficiency, space utilization, and IT equipment inventory. This system is governed by our cross-functional approval board with representatives from IT, Facilities, and Operations as required by our Information Management Policy.\"\n\nAnnual Compliance Report 2024, Page 8\n\"The implementation of our enhanced DCIM platform in Q2 2023 has improved data accuracy by 28% and reduced reporting time by 45%, enabling more effective decision-making across departments. All mandatory fields specified in CoC Section 3.1.1 are captured and verified quarterly.\""}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => applyTemplate(rag_answer)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                marginTop: '8px',
                                                color: '#4F46E5',
                                                fontSize: '14px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0'
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ marginRight: '4px' }}>
                                                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                                            </svg>
                                            Use This Example
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 style={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        color: '#111827',
                                        marginBottom: '8px' 
                                    }}>
                                        <span style={{ 
                                            color: '#DC2626',
                                            marginRight: '8px'
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        Bad Example (Not Conformant)
                                    </h4>
                                    <div style={{ 
                                        backgroundColor: 'white',
                                        border: '1px solid #FECACA',
                                        borderRadius: '6px',
                                        padding: '16px'
                                    }}>
                                        <p style={{ 
                                            margin: '0',
                                            color: '#4B5563' 
                                        }}>
                                            {badExampleAnswer}
                                        </p>
                                    </div>
                                    <div style={{ 
                                        marginTop: '8px',
                                        padding: '12px',
                                        backgroundColor: '#FEE2E2',
                                        borderLeft: '4px solid #EF4444',
                                        color: '#991B1B',
                                        fontSize: '14px'
                                    }}>
                                        <strong>Why this is inadequate:</strong> {badExampleFeedback}
                                    </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    );
};
// JurisdictionSelector Component
const JurisdictionSelector = ({ jurisdictions, selectedJurisdiction, onJurisdictionChange }) => {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginLeft: '16px'
      }}>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: '500',
          color: '#6B7280',
          marginRight: '8px' 
        }}>
          Jurisdiction:
        </span>
        <select 
          value={selectedJurisdiction}
          onChange={(e) => onJurisdictionChange(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            backgroundColor: 'white',
            fontSize: '14px',
            color: '#374151'
          }}
        >
          {jurisdictions.map(jurisdiction => (
            <option key={jurisdiction} value={jurisdiction}>
              {jurisdiction}
            </option>
          ))}
        </select>
      </div>
    );
  };
  
  // TooltipInfo Component
  const TooltipInfo = ({ tooltipText }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    if (!tooltipText) return null;
    
    return (
      <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          style={{
            background: 'none',
            border: 'none',
            color: '#4F46E5',
            cursor: 'pointer',
            padding: '0',
            fontSize: '20px',
            lineHeight: '1',
            display: 'flex'
          }}
          aria-label="Show country-specific guidance"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </button>
        
        {isOpen && (
          <div style={{
            position: 'absolute',
            zIndex: '10',
            width: '320px',
            right: '-10px',
            top: '100%',
            marginTop: '8px',
            padding: '12px 16px',
            backgroundColor: '#EBF8FF',
            color: '#1E40AF',
            fontSize: '14px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #BFDBFE'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              marginBottom: '8px' 
            }}>
              <div style={{ 
                color: '#3B82F6', 
                marginRight: '8px',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17A3 3 0 015 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                  <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                </svg>
              </div>
              <p style={{ margin: 0, lineHeight: '1.5' }}>
                {tooltipText}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const WorklfowTaskCreation = () => {
    const { user, isAuthenticated } = useAuth0();
    const { createTask } = useTaskGoalIntegration(); // context method
  
    const CreateWorkflowTask = async (triggeredByUser) => {
      if (!isAuthenticated || !user?.email) {
        alert("You must be logged in to create a task.");
        return;
      }
  
      try {
        const task = {
          title: 'Test Workflow Task',
          description: 'This task was created from the workflow UI.',
          status: 'TODO',
          category: 'ENERGY_EFFICIENCY', // or any category you need
          dueDate: new Date().toISOString().split('T')[0],
          assignees: [],
          priority: 'MEDIUM'
        };
  
        const created = await createTask(task);
        console.log('✅ Task created successfully:', created);
  
        if (triggeredByUser) {
          alert(`Task "${created.title}" created successfully.`);
        }
      } catch (err) {
        console.error('❌ Error creating task:', err);
        alert('Failed to create task. Please try again.');
      }
    };
  
    return (
      <button
        onClick={() => CreateWorkflowTask(true)}
        style={{
          padding: '8px 16px',
          backgroundColor: 'white',
          color: '#4B5563',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          marginRight: '8px',
        }}
      >
        Create Task
      </button>
    );
  };

  const WorkflowWizard = () => {
    const [searchParams] = useSearchParams();
    const workflow_id = searchParams.get("workflow");
    const others = useOthers();
    const { user } = useAuth0();
    
    // Add missing state variables
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [stepSections, setStepSections] = useState([]);
    const [answers, setAnswers] = useState({});
    const [saveStatus] = useState({});
    const [validationErrors] = useState({});
    const [auditProgress] = useState(0);
    const [openSections, setOpenSections] = useState({});
    const [error, setError] = useState(null);
    
    // New state variables for environmental workflow
    const [selectedJurisdiction, setSelectedJurisdiction] = useState('EU');
    const [jurisdictions] = useState(['EU']); // Keep state but remove setter if not used elsewhere
    const [tooltipSupport] = useState(false); // Keep state but remove setter if not used elsewhere
    
    // Check if this is the environmental workflow
    const isEnvironmentalWorkflow = workflow_id === 'environmental';
    
    // Jurisdiction change handler
    const handleJurisdictionChange = (jurisdiction) => {
        setSelectedJurisdiction(jurisdiction);
    };

    // Extract online users directly from Liveblocks
    const onlineUsers = others
        .filter(other => other.presence?.user)
        .map(other => other.presence.user);
    
    // Map of questions being viewed by other users - direct access
    const questionsBeingViewed = others.reduce((acc, other) => {
        if (other.presence?.viewingQuestionId) {
            if (!acc[other.presence.viewingQuestionId]) {
                acc[other.presence.viewingQuestionId] = [];
            }
            if (other.presence.user) {
                acc[other.presence.viewingQuestionId].push(other.presence.user);
            }
        }
        return acc;
    }, {});

    // For testing only - added to enable loading from local files without changing UI
    const useLocalFiles = localStorage.getItem('useLocalFiles') === 'true';

    // Map workflow_id to the corresponding JSON file for local testing
    const getJsonFilename = (id) => {
        const mapping = {
            'eed': 'uberEED.json',
            'coc': 'uberCOC.json',
            'taxonomy': 'uberEUTaxonomy.json',
            'iso9001': 'uberISO9001.json',
            'iso14001': 'uberISO14001.json',
            'iso27001': 'uberISO27001.json',
            'environmental': 'environmental_permit.json'  // Updated to match actual filename
        };
        
        return mapping[id] || 'uberCOC.json'; // Default to COC if not found
    };

    // Process the loaded JSON data
    const processWorkflowData = useCallback((data) => {
        console.log('[Process Data] Starting processWorkflowData with data:', {
            workflow: workflow_id,
            hasSteps: Object.keys(data).some(key => key.startsWith('step_')),
            stepCount: Object.keys(data).filter(key => key.startsWith('step_')).length
        });
        
        const newStepSections = [];
        const allQuestions = [];
        
        // Process all workflows uniformly
        Object.keys(data).forEach(key => {
            if (key.startsWith('step_')) {
                const stepData = data[key];
                const stepIndex = key.replace('step_', '');
                const stepId = parseInt(stepIndex, 10);
                const subtitle = `Step ${stepIndex}: ${stepData.description}`;
                
                newStepSections.push({
                    step_id: stepId,
                    step_description: subtitle,
                    directive: stepData.directive || '',
                    tooltip: stepData.tooltip || {},
                    reviewers: stepData.reviewers || []
                });

                // Process questions for this step
                Object.keys(stepData.questions || {}).forEach(qKey => {
                    const qData = stepData.questions[qKey];
                    const questionId = parseInt(qKey.replace('question_', ''), 10);
                    
                    allQuestions.push({
                        id: questionId,
                        step_id: stepId,
                        questionKey: qKey,
                        title: qData.reference || '',
                        question: qData.questionText || qData.question_text,
                        simplifiedQuestion: qData.simplifiedQuestion || `Do you have a process for this that complies with ${qData.reference}?`,
                        status: 'pending',
                        recommendation: '',
                        recommendationTitle: '',
                        rag_answer: '',
                        valDefinition: '',
                        stepSection: subtitle,
                        priority: qData.priority || 'Medium',
                        expertTip: qData.expertTip || '',
                        whatThisMeans: qData.whatThisMeans || '',
                        complianceRequires: qData.complianceRequires || '',
                        verificationMethods: qData.verificationMethods || '',
                        majorNonconformity: qData.majorNonconformity || '',
                        minorNonconformity: qData.minorNonconformity || '',
                        sampleResponseTemplate: qData.sampleResponseTemplate || '',
                        humanInputExample: qData.humanInputAnswer || '',
                        recommendedEvidence: qData.recommendedEvidence || '',
                        recommendedActions: qData.recommendedActions || '',
                        acceptedFileTypes: qData.acceptedFiles || 'pdf, docx, xlsx',
                        documentDescriptor: qData.documentDescriptor || '',
                        docRequired: qData.docRequired || 'Yes',
                        badExampleAnswer: qData.badExampleAnswer || '',
                        badExampleFeedback: qData.badExampleFeedback || '',
                    });
                });
            }
        });
        
        setStepSections(newStepSections);
        setQuestions(allQuestions);
        setLoading(false);
    }, [workflow_id]);

    // Load data from API endpoints (with enhancements)
    const loadApiData = useCallback(() => {
        console.log(`[API Load] Starting loadApiData for workflow: ${workflow_id}`);
        
        // First, clear any cached data
        clearCachedAnswers();
        
        // First fetch questions and set up structure
        fetch(`https://workflow-api-866853235757.europe-west3.run.app/api/v1/load_questions?workflow=${workflow_id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('[API Load] Network response for questions was not ok');
                }
                return response.json();
            })
            .then(questionData => {
                console.log('[API Load] Raw questions data loaded:', questionData);
                
                // Process questions first to establish structure
                const newStepSections = [];
                const processedQuestions = [];
                
                // Process question data similar to processWorkflowData...
                let numSteps = 0;
                Object.keys(questionData).forEach(key => {
                    if (key.startsWith('step_')) {
                        numSteps++;
                    }
                });

                const processStep = (stepIndex) => {
                    const stepKey = `step_${stepIndex}`;
                    if (!questionData[stepKey]) return [];

                    const stepData = questionData[stepKey];
                    const subtitle = `Step ${stepIndex}: ${stepData.description}`;

                    newStepSections.push({ 
                        step_id: stepIndex, 
                        step_description: subtitle
                    });

                    return Object.keys(stepData.questions || {}).map(qKey => {
                        const qData = stepData.questions[qKey];
                        if (!qData.questionText) return null;

                        const questionId = parseInt(qKey.replace('question_', ''), 10);

                        return {
                            id: questionId,
                            step_id: stepIndex,
                            questionKey: qKey,
                            title: qData.reference || '',
                            question: qData.question_text,
                            simplifiedQuestion: qData.simplifiedQuestion || `Do you have a process for this that complies with ${qData.reference}?`,
                            status: 'pending',
                            recommendation: '',
                            recommendationTitle: '',
                            rag_answer: '',
                            valDefinition: '',
                            stepSection: subtitle,
                            priority: qData.priority || 'Medium',
                            expertTip: qData.expertTip || '',
                            whatThisMeans: qData.whatThisMeans || '',
                            complianceRequires: qData.complianceRequires || '',
                            verificationMethods: qData.verificationMethods || '',
                            majorNonconformity: qData.majorNonconformity || '',
                            minorNonconformity: qData.minorNonconformity || '',
                            sampleResponseTemplate: qData.sampleResponseTemplate || '',
                            humanInputExample: qData.humanInputAnswer || '',
                            recommendedEvidence: qData.recommendedEvidence || '',
                            recommendedActions: qData.recommendedActions || '',
                            acceptedFileTypes: qData.acceptedFiles || 'pdf, docx, xlsx',
                            documentDescriptor: qData.documentDescriptor || '',
                            docRequired: qData.docRequired || 'Yes',
                            badExampleAnswer: qData.badExampleAnswer || '',
                            badExampleFeedback: qData.badExampleFeedback || '',
                        };
                    }).filter(Boolean);
                };

                for (let i = 0; i <= numSteps; i++) {
                    processedQuestions.push(...processStep(i));
                }
                setStepSections(newStepSections);
                setQuestions(processedQuestions.filter(q => {
                    // Filter out questions that are not relevant
                    // If necessary in the future                    
                    return true;
                }));
                console.log('[API Load] setQuestions called with processed data.');

                // After questions are set up, load answers
                return fetch(`https://fetching-api-866853235757.europe-west3.run.app/workflow-answers?workflow=${workflow_id}`);
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('[API Load] Network response for answers was not ok');
                }
                return response.json();
            })
            .then(answerData => {
                console.log('[API Load] Raw answers data loaded:', answerData);
                
                // Apply strict sanitization to filter out invalid answers
                const sanitizedAnswers = sanitizeAnswers(answerData);
                setAnswers(sanitizedAnswers);
                
                console.log('[API Load] setAnswers called with sanitized data:', sanitizedAnswers);
                setLoading(false);
            })
            .catch(error => {
                console.error('[API Load] Error loading data:', error);
                setAnswers({});
                setLoading(false);
            });
    }, [workflow_id]);

    // Load from local JSON files (for testing) - STANDARDIZED FOR ALL WORKFLOWS
    const loadLocalData = useCallback(async () => {
        try {
            // Clear any cached data first
            clearCachedAnswers();
            
            const jsonFilename = getJsonFilename(workflow_id);
            console.log(`[Local Load] Attempting to load local file: ${jsonFilename} for workflow: ${workflow_id}`);
            
            const response = await fetch(`/data/${jsonFilename}`);
            if (!response.ok) {
                throw new Error(`[Local Load] Failed to load ${jsonFilename}: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[Local Load] Raw data loaded:', {
                workflow: workflow_id,
                hasSteps: Object.keys(data).some(key => key.startsWith('step_')),
                stepCount: Object.keys(data).filter(key => key.startsWith('step_')).length,
                firstStep: Object.keys(data).find(key => key.startsWith('step_'))
            });
            
            // If answers are included in the data
            if (data.answers) {
                data.answers = sanitizeAnswers(data.answers);
            }
            
            console.log('[Local Load] Data before processWorkflowData:', data);
            processWorkflowData(data);
            console.log('[Local Load] processWorkflowData finished with sanitized data');
        } catch (error) {
            console.error("[Local Load] Error loading local workflow data:", error);
            setLoading(false);
            // Fall back to API for all workflows
            loadApiData();
        }
    }, [workflow_id, loadApiData, processWorkflowData]);

    // Clear any cached answers first when component mounts
    useEffect(() => {
        // Clear any cached answers first
        clearCachedAnswers();
        
        setLoading(true);
        
        // For testing, check if we should load from local files
        if (useLocalFiles) {
            console.log('Loading from local files (test mode)');
            loadLocalData();
        } else {
            // Regular API loading
            loadApiData();
        }
    }, [workflow_id, useLocalFiles, loadLocalData, loadApiData]);

    // Add missing helper functions and variables before return
    const getWorkflowTitle = (id) => {
      switch (id) {
        case 'eed': return 'EU Energy Efficiency Directive (EED) 2023/1791';
        case 'coc': return 'EU Code of Conduct for Data Centers';
        case 'taxonomy': return 'EU Taxonomy Regulation (EU) 2020/852';
        case 'iso9001': return 'ISO 9001 Quality Management Systems (QMS)';
        case 'iso14001': return 'ISO 14001 Environmental Management Systems (EMS)';
        case 'iso27001': return 'ISO 27001 Information Security Management Systems (ISMS)';
        case 'environmental': return 'EU Environmental Permitting for Data Centres';
        default: return 'Unknown Workflow: ' + id;
      }
    };
    const workflowTitle = getWorkflowTitle(workflow_id);

    const calculateStepProgress = (stepId) => {
      const stepQuestions = questions.filter(q => q.step_id === stepId);
      if (stepQuestions.length === 0) return 0;
      const answeredQuestions = stepQuestions.filter(q => {
        const answerKey = `question_${q.id}`;
        const answer = answers[answerKey];
        return answer && answer.response && typeof answer.response === 'string' && answer.response.trim().length >= 10;
      });
      return (answeredQuestions.length / stepQuestions.length) * 100;
    };

    const toggleSection = (stepId) => {
      setOpenSections(prev => ({
        ...prev,
        [stepId]: !prev[stepId]
      }));
    };

    const handleSaveAnswer = async (questionId, answer, evidence) => {
      // Implement your save logic here, or use your previous implementation
      // For now, just a placeholder
      // You can copy your previous implementation if you had one
      console.log('Save answer:', { questionId, answer, evidence });
    };

    return (
        <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', padding: '24px 0' }}>
            {/* Add global styles for animations */}
            <style>{globalStyles}</style>
            
            <div style={{ 
                maxWidth: '1200px', 
                margin: '0 auto', 
                padding: '0 16px' 
            }}>
                {/* Header with title and jurisdiction selector */}
                <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px' 
                }}>
                    <h1 style={{ 
                        fontSize: '28px', 
                        fontWeight: '700', 
                        color: '#111827',
                        margin: '0'
                    }}>
                        {workflowTitle}
                    </h1>
                    
                    {/* Jurisdiction selector for environmental workflow */}
                    {isEnvironmentalWorkflow && tooltipSupport && (
                        <JurisdictionSelector
                            jurisdictions={jurisdictions}
                            selectedJurisdiction={selectedJurisdiction}
                            onJurisdictionChange={handleJurisdictionChange}
                        />
                    )}
                </div>
                
                {/* Online Users */}
                <div style={{ 
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <span style={{ 
                        fontSize: '14px', 
                        color: '#6B7280',
                        marginRight: '12px'
                    }}>
                        Online now:
                    </span>
                    <div style={{ display: 'flex' }}>
                        {onlineUsers.map((user, idx) => (
                            <div
                                key={idx}
                                title={user.name || user.email}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#3B82F6',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    marginRight: '-8px',
                                    border: '2px solid white',
                                    zIndex: onlineUsers.length - idx,
                                    position: 'relative'
                                }}
                            >
                                {(user.name || user.email || "?").charAt(0).toUpperCase()}
                            </div>
                        ))}
                        
                        {/* Current user */}
                        {user && (
                            <div
                                title={`You (${user.name || user.email})`}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    marginRight: '-8px',
                                    border: '2px solid white',
                                    zIndex: 0,
                                    position: 'relative'
                                }}
                            >
                                {(user.name || user.email || "?").charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Step sections */}
                {loading ? (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        padding: '32px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            display: 'inline-block',
                            width: '48px',
                            height: '48px',
                            border: '3px solid #E5E7EB',
                            borderTopColor: '#3B82F6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '16px'
                        }}></div>
                        <p style={{ color: '#6B7280', fontSize: '16px', margin: '0' }}>Loading workflow data...</p>
                    </div>
                ) : (
                    stepSections.map((section) => (
                        <div key={section.step_id} style={{
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            marginBottom: '24px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '16px 24px',
                                backgroundColor: '#F9FAFB',
                                borderBottom: openSections[section.step_id] ? '1px solid #E5E7EB' : 'none',
                                cursor: 'pointer'
                            }}
                            onClick={() => setOpenSections(prev => ({
                                ...prev,
                                [section.step_id]: !prev[section.step_id]
                            }))}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <h3 style={{ 
                                            fontSize: '18px', 
                                            fontWeight: '600', 
                                            color: '#111827',
                                            margin: '0 0 4px 0'
                                        }}>
                                            {section.step_description}
                                        </h3>
                                        {section.directive && (
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <p style={{ 
                                                    fontSize: '14px', 
                                                    color: '#6B7280',
                                                    margin: '0'
                                                }}>
                                                    {section.directive}
                                                </p>
                                                
                                                {/* Add tooltip support if available */}
                                                {tooltipSupport && section.tooltip && section.tooltip[selectedJurisdiction] && (
                                                    <TooltipInfo 
                                                        tooltipText={section.tooltip[selectedJurisdiction]} 
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        gap: '16px'
                                    }}>
                                        {/* Progress bars */}
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            {/* Step progress */}
                                            <div style={{ width: '160px' }}>
                                                <div style={{ 
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '14px',
                                                    marginBottom: '4px'
                                                }}>
                                                    <span style={{ color: '#6B7280' }}>Progress:</span>
                                                    <span style={{ 
                                                        fontWeight: '600', 
                                                        color: '#111827'
                                                    }}>
                                                        {Math.floor(calculateStepProgress(section.step_id))}%
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '8px',
                                                    backgroundColor: '#E5E7EB',
                                                    borderRadius: '9999px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div 
                                                        style={{ 
                                                            height: '100%',
                                                            backgroundColor: '#10B981',
                                                            borderRadius: '9999px',
                                                            width: `${calculateStepProgress(section.step_id)}%` 
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Audit progress */}
                                            <div style={{ width: '160px' }}>
                                                <div style={{ 
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '14px',
                                                    marginBottom: '4px'
                                                }}>
                                                    <span style={{ color: '#6B7280' }}>Audit:</span>
                                                    <span style={{ 
                                                        fontWeight: '600', 
                                                        color: '#111827'
                                                    }}>
                                                        {Math.floor(auditProgress)}%
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '8px',
                                                    backgroundColor: '#E5E7EB',
                                                    borderRadius: '9999px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div 
                                                        style={{ 
                                                            height: '100%',
                                                            backgroundColor: '#3B82F6',
                                                            borderRadius: '9999px',
                                                            width: `${auditProgress}%` 
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSection(section.step_id);
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: openSections[section.step_id] ? '#EBF5FF' : 'white',
                                                color: openSections[section.step_id] ? '#1E40AF' : '#4B5563',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '6px',
                                                fontWeight: '500',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {openSections[section.step_id] ? 'Close' : 'Open'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {openSections[section.step_id] && (
                                <div style={{ padding: '24px' }}>
                                    {questions
                                        .filter(q => q.step_id === section.step_id)
                                        .map((q) => (
                                            <QuestionItem 
                                                key={`${q.step_id}-${q.questionKey}`} 
                                                {...q}
                                                savedAnswer={answers[`question_${q.id}`]}
                                                questionsBeingViewed={questionsBeingViewed}
                                                onSave={handleSaveAnswer}
                                                saveStatus={saveStatus[`question_${q.id}`]}
                                                validationErrors={validationErrors[`question_${q.id}`]}
                                            />
                                        ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            
            {/* Display error message if loading failed */}
            {error && (
                <div style={{
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    padding: '12px',
                    margin: '16px auto',
                    maxWidth: '1200px',
                    color: '#991B1B',
                    textAlign: 'center'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Add debug and repair panel */}
            {!loading && <DebugRepairPanel answers={answers} questions={questions} setAnswers={setAnswers} />}
        </div>
    );
};

export default WorkflowWizard;