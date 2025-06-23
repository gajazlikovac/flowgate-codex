// src/components/Steps/ReportUpload.js
import React, { useState, useRef } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import * as pdfProcessor from '../../services/pdfProcessor';

// Compliance standards options
const complianceStandards = [
  { id: 'eu-taxonomy', name: 'EU Taxonomy' },
  { id: 'eu-code-of-conduct', name: 'EU Code of Conduct' },
  { id: 'eed', name: 'EED (Energy Efficiency Directive)' },
  { id: 'iso-27001', name: 'ISO 27001' },
  { id: 'iso-14001', name: 'ISO 14001' },
  { id: 'iso-9001', name: 'ISO 9001' }
];

const ReportUpload = () => {
  const { 
    uploadedFiles, 
    setUploadedFiles, 
    selectedStandards,
    setSelectedStandards,
    nextStep, 
    prevStep, 
    setProcessing, 
    isProcessing,
    setExtractedGoals,
    setError,
    setSkipFileUpload
  } = useOnboarding();
  
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Process files - only accept PDFs
  const handleFiles = (files) => {
    const newFiles = [...uploadedFiles];
    
    // Convert FileList to array and filter for PDFs only
    Array.from(files).forEach(file => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'pdf') {
        // Check if file already exists in the array
        const fileExists = newFiles.some(existingFile => 
          existingFile.name === file.name && 
          existingFile.size === file.size
        );
        
        if (!fileExists) {
          newFiles.push(file);
        }
      }
    });
    
    setUploadedFiles(newFiles);
  };

  // Remove file from list
  const removeFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };

  // Button click to open file dialog
  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Toggle standard selection
  const toggleStandard = (standardId) => {
    if (selectedStandards.includes(standardId)) {
      setSelectedStandards(selectedStandards.filter(id => id !== standardId));
    } else {
      setSelectedStandards([...selectedStandards, standardId]);
    }
  };

  // Skip file upload and continue with standards-based goals
  const handleSkip = async () => {
    if (selectedStandards.length === 0) {
      setError('Please select at least one compliance standard before continuing.');
      return;
    }
    
    setProcessing(true);
    setSkipFileUpload(true);
    
    try {
      // Use standards-based goals from pdfProcessor
      const standardsGoals = pdfProcessor.getDefaultStandardsBasedGoals(selectedStandards);
      
      // Create the extracted data structure
      const extractedData = {
        confidence: 0.85,
        pillars: [
          {
            id: 'env',
            name: 'Environment',
            description: 'Environmental sustainability goals',
            goals: []
          },
          {
            id: 'soc',
            name: 'Social',
            description: 'Social responsibility goals',
            goals: []
          },
          {
            id: 'gov',
            name: 'Governance & Compliance',
            description: 'Regulatory compliance and governance goals',
            goals: []
          }
        ]
      };
      
      // Add goals to the appropriate pillars
      standardsGoals.forEach(goal => {
        const pillar = extractedData.pillars.find(p => p.id === goal.pillarId);
        if (pillar) {
          const { pillarId, ...goalData } = goal;
          pillar.goals.push(goalData);
        }
      });
      
      setExtractedGoals(extractedData);
      nextStep();
    } catch (error) {
      console.error('Error generating standards-based goals:', error);
      setError('An error occurred while generating goals. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Process uploaded files
  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one sustainability report or choose to skip file upload.');
      return;
    }

    if (selectedStandards.length === 0) {
      setError('Please select at least one compliance standard before continuing.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log("Starting to process files...");
      
      // Initialize the extracted data structure
      const extractedData = {
        confidence: 0.85,
        pillars: [
          {
            id: 'env',
            name: 'Environment',
            description: 'Environmental sustainability goals',
            goals: []
          },
          {
            id: 'soc',
            name: 'Social',
            description: 'Social responsibility goals',
            goals: []
          },
          {
            id: 'gov',
            name: 'Governance & Compliance',
            description: 'Regulatory compliance and governance goals',
            goals: []
          }
        ]
      };

      // Process each uploaded file
      for (const file of uploadedFiles) {
        console.log(`Processing file: ${file.name}`);
        
        try {
          // Extract text from PDF using the updated service
          const extractedText = await pdfProcessor.extractTextFromPdf(file);
          
          if (extractedText && extractedText.length > 0) {
            console.log(`Successfully extracted ${extractedText.length} characters from ${file.name}`);
            
            // Process the extracted text with Gemini API using the updated service
            const goals = await pdfProcessor.processWithGeminiAPI(extractedText, selectedStandards, complianceStandards);
            
            // Add goals to the appropriate pillars
            goals.forEach(goal => {
              const pillar = extractedData.pillars.find(p => p.id === goal.pillarId);
              if (pillar) {
                const { pillarId, ...goalData } = goal;
                pillar.goals.push(goalData);
              }
            });
          } else {
            console.warn(`No text was extracted from ${file.name}`);
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }
      
      // Add standards-based goals if no goals were extracted from files
      if (!extractedData.pillars.some(pillar => pillar.goals.length > 0)) {
        console.log("No goals extracted from files, using standards-based goals");
        const standardsGoals = pdfProcessor.getDefaultStandardsBasedGoals(selectedStandards);
        standardsGoals.forEach(goal => {
          const pillar = extractedData.pillars.find(p => p.id === goal.pillarId);
          if (pillar) {
            const { pillarId, ...goalData } = goal;
            pillar.goals.push(goalData);
          }
        });
      }
      
      console.log("Setting extracted goals and moving to next step");
      setExtractedGoals(extractedData);
      nextStep();
    } catch (error) {
      console.error('Error processing files:', error);
      setError('An error occurred while processing your files. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="report-upload-container">
      <h2>Upload Sustainability Reports</h2>
      <p className="description">
        Upload your data center sustainability reports to automatically extract goals and targets.
        This step is optional - you can skip file upload and continue with manual goal setting.
      </p>
      
      <div className="standards-selection">
        <h3>Select Applicable Compliance Standards *</h3>
        <p className="description">Select all the compliance standards that apply to your data centers.</p>
        
        <div className="standards-grid">
          {complianceStandards.map(standard => (
            <div 
              key={standard.id} 
              className={`standard-card ${selectedStandards.includes(standard.id) ? 'selected' : ''}`}
              onClick={() => toggleStandard(standard.id)}
            >
              <div className="standard-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedStandards.includes(standard.id)}
                  onChange={() => {}} // handled by the div click
                  id={`standard-${standard.id}`}
                />
                <label htmlFor={`standard-${standard.id}`}></label>
              </div>
              <div className="standard-name">{standard.name}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div 
        className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        
        <div className="upload-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3V16M12 3L7 8M12 3L17 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <div className="upload-text">
          <p>Drag and drop your PDF files here</p>
          <p className="or">or</p>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onButtonClick}
          >
            Browse Files
          </button>
        </div>
        
        <p className="supported-files">
          Supported format: PDF only
        </p>
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <h3>Uploaded Files ({uploadedFiles.length})</h3>
          <ul className="file-list">
            {uploadedFiles.map((file, index) => (
              <li key={index} className="file-item">
                <div className="file-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 11H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{formatFileSize(file.size)}</div>
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeFile(index)}
                  disabled={isProcessing}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isProcessing && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <p>Processing your sustainability reports...</p>
          <p className="processing-note">This may take a few minutes depending on the size and complexity of your reports.</p>
        </div>
      )}
      
      <div className="form-actions">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={prevStep}
          disabled={isProcessing}
        >
          Back
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleSkip}
          disabled={isProcessing || selectedStandards.length === 0}
        >
          Skip File Upload
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={processFiles}
          disabled={uploadedFiles.length === 0 || selectedStandards.length === 0 || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Process Reports'}
        </button>
      </div>
    </div>
  );
};

export default ReportUpload;