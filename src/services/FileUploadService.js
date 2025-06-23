// FileUploadService.js - Enhanced with document vault integration - Fixed version

import axios from 'axios';
import { GoogleGenAI, createPartFromUri } from "@google/genai";

class FileUploadService {
    constructor() {
      // API endpoints and auth
      this.uploadEndpoint = 'https://document-upload-866853235757.europe-west3.run.app/upload';
      this.proxyEndpoint = 'https://document-upload-866853235757.europe-west3.run.app/proxy-pdf';
      this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
      
      // Initialize Gemini API with error handling
      this.initializeGeminiAPI();
      
      // File storage & tracking
      this.fileCache = new Map();
      
      // Concurrency management
      this.maxConcurrentUploads = 10;
      this.uploadQueue = [];
      this.activeUploads = 0;
      this.processingPromise = null;
      this._isProcessingQueue = false; // Flag to prevent multiple queue processors
      
      // Retry configuration
      this.maxRetries = 3;
      this.retryDelayMs = 2000;
      
      // Timeout configuration
      this.uploadTimeoutMs = 120000;  // 2 minutes for uploads
      this.processingTimeoutMs = 300000; // 5 minutes for processing
      
      // File size config based on Gemini documentation
      this.maxFileSize = 50 * 1024 * 1024; // 50MB max
      this.fileApiThreshold = 20 * 1024 * 1024; // Use Gemini File API for files >20MB
      
      // Supported file types (same as original)
      this.supportedTypes = {
        'application/pdf': true,               // PDF
        'application/x-javascript': true,      // JavaScript
        'text/javascript': true,               // JavaScript
        'application/x-python': true,          // Python
        'text/x-python': true,                 // Python
        'text/plain': true,                    // TXT
        'text/html': true,                     // HTML
        'text/css': true,                      // CSS
        'text/md': true,                       // Markdown
        'text/csv': true,                      // CSV
        'text/xml': true,                      // XML
        'text/rtf': true,                      // RTF
        'application/msword': true,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
        'application/vnd.ms-excel': true,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
        'image/jpeg': true,
        'image/png': true,
        'image/gif': true,
        'image/webp': true,
        'application/json': true
      };
      
      // Initialize cache
      this.loadCachedFiles();
      
      // Save cache when page is closed
      window.addEventListener('beforeunload', () => this.saveCachedFiles());
      
      // NEW: Document vault category mapping
      // Define mapping from frameworks/workflows to document vault categories
      this.frameworkToVaultCategoryMap = {
        // Compliance Frameworks
        'EU Taxonomy': 'legal-compliance',
        'Energy Efficiency Directive': 'energy-docs',
        'EU Code of Conduct': 'technical-docs',
        
        // ISO Standards
        'ISO 14001': 'environmental',
        'ISO 9001': 'legal-compliance',
        'ISO 27001': 'security-docs',
        
        // Environmental Permits
        'Water Usage Permit': 'environmental',
        'Water': 'environmental',
        'Air': 'environmental',
        'Waste': 'environmental',
        'Discharge': 'environmental',
        
        // Default categories for each workflow type
        'iso-default': 'legal-compliance',
        'compliance-default': 'legal-compliance',
        'permit-default': 'environmental',
        'wizard-default': 'legal-compliance'
      };

      // Map specific document types to categories
      this.documentTypeToVaultCategoryMap = {
        // Energy documents
        'Energy Audit Report': 'energy-docs',
        'Energy Consumption Data': 'energy-docs',
        'Energy Management Policy': 'energy-docs',
        'Building Technical Specs': 'facility-docs',
        'Equipment Inventory': 'technical-docs',
        'PUE Reports': 'technical-docs',
        'Cooling System Specifications': 'technical-docs',
        'Server Utilization Data': 'technical-docs',
        'Energy Monitoring Procedures': 'operations-docs',
        'IT Equipment Inventory': 'technical-docs',
        'PUE and Energy Metrics Reports': 'energy-docs',
        'Carbon Footprint Assessments': 'energy-docs',
        
        // EU Taxonomy documents
        'Climate Risk Assessment': 'risk-management',
        'Technical Screening Evidence': 'legal-compliance',
        'DNSH Compliance Documents': 'legal-compliance',
        'Human Rights Policy': 'corporate-docs',
        'Revenue Allocation Report': 'corporate-docs',
        
        // Environmental documents
        'Environmental Policy Document': 'environmental',
        'Environmental Aspects Register': 'environmental',
        'Legal Compliance Register': 'legal-compliance',
        'Management Review Minutes': 'corporate-docs',
        'Environmental Objectives': 'environmental',
        'Water Usage Analysis': 'environmental',
        'Environmental Impact Statement': 'environmental',
        'Water Treatment Plans': 'environmental',
        'Chemical Inventory': 'environmental',
        'Discharge Monitoring Plan': 'environmental',
        'Waste Management Plans': 'environmental',
        'Environmental Impact Assessments': 'environmental',
        'Sustainability Reports': 'environmental',
        
        // ISO documents
        'Quality Manual': 'legal-compliance',
        'Process Maps': 'operations-docs',
        'Internal Audit Reports': 'legal-compliance',
        'Corrective Action Register': 'operations-docs',
        'Customer Feedback Data': 'customer-docs',
        'Information Security Policy': 'security-docs',
        'Risk Assessment Report': 'risk-management',
        'Statement of Applicability': 'security-docs',
        'Business Continuity Plan': 'risk-management',
        'Security Incident Register': 'security-docs'
      };
      
      // GCS folder mapping for the 15 document vault folders
      this.gcsFolderMapping = {
        'corporate-docs': 'corporate',
        'property-docs': 'property',
        'legal-compliance': 'legal',
        'contract-docs': 'contracts',
        'facility-docs': 'facility',
        'energy-docs': 'energy',
        'technical-docs': 'technical',
        'operations-docs': 'operations',
        'security-docs': 'security',
        'risk-management': 'risk',
        'customer-docs': 'customer',
        'training-docs': 'training',
        'health-safety': 'safety',
        'environmental': 'environmental',
        'others': 'other'
      };
      
      // GCS bucket base path
      this.gcpBucketBase = 'https://storage.googleapis.com/datacenter_x_document_vault';
    }
    
    // Initialize Gemini API (unchanged)
    initializeGeminiAPI() {
      try {
        if (!this.geminiApiKey) {
          console.error("Gemini API key is missing. Please set REACT_APP_GEMINI_API_KEY environment variable.");
          this.apiInitialized = false;
          return;
        }
        
        this.genAI = new GoogleGenAI({ 
          apiKey: this.geminiApiKey,
          timeout: 60000 // 60-second global timeout
        });
        
        this.apiInitialized = true;
        console.log("Gemini API initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Gemini API:", error);
        this.apiInitialized = false;
      }
    }
    
    // Method to verify API connectivity (unchanged)
    async verifyGeminiConnection() {
      if (!this.apiInitialized) {
        console.log("Attempting to reinitialize Gemini API...");
        this.initializeGeminiAPI();
        
        if (!this.apiInitialized) {
          throw new Error("Cannot connect to Gemini API - initialization failed");
        }
      }
      
      try {
        // Simple ping to verify connectivity
        await this.genAI.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ text: "ping" }],
          generationConfig: { maxOutputTokens: 1 }
        });
        
        console.log("Gemini API connection verified");
        return true;
      } catch (error) {
        console.error("Gemini API connection test failed:", error);
        throw new Error(`Gemini API connection failed: ${error.message}`);
      }
    }
    
    // NEW: Determine category based on intelligent rules
    determineCategory(file, options = {}) {
      const { workflow, documentName, questionContext, category } = options;
      
      // If category is explicitly provided, use it
      if (category) {
        return category;
      }
      
      // First priority: Use document name if available (for critical documents)
      if (documentName && this.documentTypeToVaultCategoryMap[documentName]) {
        console.log(`Categorizing "${file.name}" as "${this.documentTypeToVaultCategoryMap[documentName]}" based on document name "${documentName}"`);
        return this.documentTypeToVaultCategoryMap[documentName];
      }
      
      // Second priority: Use the workflow title to map to vault category
      if (workflow && workflow.title) {
        // Check for exact match
        if (this.frameworkToVaultCategoryMap[workflow.title]) {
          console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap[workflow.title]}" based on workflow title "${workflow.title}"`);
          return this.frameworkToVaultCategoryMap[workflow.title];
        }
        
        // Check for partial matches
        if (workflow.title.includes('ISO')) {
          // Try to match specific ISO standard
          if (workflow.title.includes('14001')) {
            console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['ISO 14001']}" based on ISO 14001 in workflow title`);
            return this.frameworkToVaultCategoryMap['ISO 14001'];
          }
          if (workflow.title.includes('9001')) {
            console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['ISO 9001']}" based on ISO 9001 in workflow title`);
            return this.frameworkToVaultCategoryMap['ISO 9001'];
          }
          if (workflow.title.includes('27001')) {
            console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['ISO 27001']}" based on ISO 27001 in workflow title`);
            return this.frameworkToVaultCategoryMap['ISO 27001'];
          }
          console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['iso-default']}" based on ISO in workflow title`);
          return this.frameworkToVaultCategoryMap['iso-default'];
        }
        
        if (workflow.title.includes('Taxonomy')) {
          console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['EU Taxonomy']}" based on Taxonomy in workflow title`);
          return this.frameworkToVaultCategoryMap['EU Taxonomy'];
        }
        
        if (workflow.title.includes('Energy') || workflow.title.includes('EED')) {
          console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['Energy Efficiency Directive']}" based on Energy/EED in workflow title`);
          return this.frameworkToVaultCategoryMap['Energy Efficiency Directive'];
        }
        
        if (workflow.title.includes('Code of Conduct')) {
          console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['EU Code of Conduct']}" based on Code of Conduct in workflow title`);
          return this.frameworkToVaultCategoryMap['EU Code of Conduct'];
        }
        
        if (workflow.title.includes('Permit')) {
          // Try to match permit type
          if (workflow.title.includes('Water')) {
            console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['Water']}" based on Water Permit in workflow title`);
            return this.frameworkToVaultCategoryMap['Water'];
          }
          if (workflow.title.includes('Air')) {
            console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['Air']}" based on Air Permit in workflow title`);
            return this.frameworkToVaultCategoryMap['Air'];
          }
          if (workflow.title.includes('Waste')) {
            console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['Waste']}" based on Waste Permit in workflow title`);
            return this.frameworkToVaultCategoryMap['Waste'];
          }
          console.log(`Categorizing "${file.name}" as "${this.frameworkToVaultCategoryMap['permit-default']}" based on Permit in workflow title`);
          return this.frameworkToVaultCategoryMap['permit-default'];
        }
      }
      
      // Third priority: Use question context (for Workflow Wizard)
      if (questionContext) {
        const lowerContext = questionContext.toLowerCase();
        if (lowerContext.includes('energy') || lowerContext.includes('power') || lowerContext.includes('electricity')) {
          console.log(`Categorizing "${file.name}" as "energy-docs" based on energy keywords in question context`);
          return 'energy-docs';
        }
        if (lowerContext.includes('security') || lowerContext.includes('access') || lowerContext.includes('breach')) {
          console.log(`Categorizing "${file.name}" as "security-docs" based on security keywords in question context`);
          return 'security-docs';
        }
        if (lowerContext.includes('environment') || lowerContext.includes('sustainability')) {
          console.log(`Categorizing "${file.name}" as "environmental" based on environmental keywords in question context`);
          return 'environmental';
        }
        if (lowerContext.includes('risk') || lowerContext.includes('continuity')) {
          console.log(`Categorizing "${file.name}" as "risk-management" based on risk keywords in question context`);
          return 'risk-management';
        }
        if (lowerContext.includes('operations') || lowerContext.includes('procedure')) {
          console.log(`Categorizing "${file.name}" as "operations-docs" based on operations keywords in question context`);
          return 'operations-docs';
        }
      }
      
      // Fourth priority: Fall back to filename-based categorization
      return this.categorizeDocumentByFilename(file);
    }
    
    // FIXED: Categorize document based on filename patterns with improved regex matching
    categorizeDocumentByFilename(file) {
      if (!file || !file.name) return 'others';
      
      const fileName = file.name.toLowerCase();
      console.log(`Starting categorization for file: ${fileName}`);
      
      // Check for specific document types first (higher specificity check)
      // For corporate documents
      if (/sustainability|report|annual|esg|policy|corporate|governance|board|minutes/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "corporate-docs" - matched corporate keywords`);
        return 'corporate-docs';
      }
      
      // For property documentation - look for property-related keywords
      if (/deed|title|property|site|land|survey|map|boundary|layout/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "property-docs" - matched property keywords`);
        return 'property-docs';
      }
      
      // For legal & compliance documentation
      if (/legal|compliance|regulation|iso|certificate|permit|license|certification/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "legal-compliance" - matched legal/compliance keywords`);
        return 'legal-compliance';
      }
      
      // For contract documentation
      if (/contract|agreement|vendor|service|sla|lease|ppa|supplier/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "contract-docs" - matched contract keywords`);
        return 'contract-docs';
      }
      
      // For facility documentation
      if (/floor|plan|diagram|layout|rack|elevation|building|bms/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "facility-docs" - matched facility keywords`);
        return 'facility-docs';
      }
      
      // For energy documentation
      if (/energy|power|efficiency|pue|carbon|epc/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "energy-docs" - matched energy keywords`);
        return 'energy-docs';
      }
      
      // For technical documentation
      if (/network|technical|architecture|infrastructure|specs|cooling|equipment|inventory/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "technical-docs" - matched technical keywords`);
        return 'technical-docs';
      }
      
      // For operations documentation
      if (/sop|procedure|operation|maintenance|manual|run/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "operations-docs" - matched operations keywords`);
        return 'operations-docs';
      }
      
      // For security documentation
      if (/security|access|incident/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "security-docs" - matched security keywords`);
        return 'security-docs';
      }
      
      // For risk management documentation
      if (/risk|disaster|recovery|continuity|emergency/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "risk-management" - matched risk keywords`);
        return 'risk-management';
      }
      
      // For customer documentation
      if (/customer|client|colocation/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "customer-docs" - matched customer keywords`);
        return 'customer-docs';
      }
      
      // For training documentation
      if (/training|certification|staff|course|learning/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "training-docs" - matched training keywords`);
        return 'training-docs';
      }
      
      // For health & safety documentation
      if (/health|safety|fire|evacuation/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "health-safety" - matched health/safety keywords`);
        return 'health-safety';
      }
      
      // For environmental documentation
      if (/environment|sustainability|waste|recycling|breeam|leed/.test(fileName)) {
        console.log(`Categorizing "${file.name}" as "environmental" - matched environmental keywords`);
        return 'environmental';
      }
      
      // Checking file extensions for additional categorization hints
      const extension = fileName.split('.').pop();
      if (extension) {
        console.log(`Checking file extension: ${extension}`);
        if (['pdf', 'doc', 'docx'].includes(extension) && /policy|report|statement/.test(fileName)) {
          console.log(`Categorizing "${file.name}" as "corporate-docs" based on document type`);
          return 'corporate-docs';
        }
        
        if (['xls', 'xlsx', 'csv'].includes(extension) && /data|metrics|analysis/.test(fileName)) {
          console.log(`Categorizing "${file.name}" as "technical-docs" based on spreadsheet type`);
          return 'technical-docs';
        }
      }
      
      // Default to "Others" if no match found
      console.log(`Categorizing "${file.name}" as "others" - no pattern match found`);
      return 'others';
    }
    
    // NEW: Get GCS folder name from vault category
    getGcsFolderName(category) {
      return this.gcsFolderMapping[category] || 'other';
    }
    
    // NEW: Sanitize filename for GCS storage
    sanitizeFileName(filename) {
      if (!filename) return 'unnamed_file';
      // Replace invalid characters with underscores
      return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    }
    
    // NEW: Generate GCS path for a file
    generateGcpPath(file, category) {
      const folderName = this.getGcsFolderName(category);
      const safeFileName = this.sanitizeFileName(file.name || 'unnamed_file');
      return `${this.gcpBucketBase}/${folderName}/${safeFileName}`;
    }
    
    // Process multiple files (enhanced with categorization)
    async processMultipleFiles(files, options = {}) {
      try {
        // First verify API connectivity
        await this.verifyGeminiConnection();
        
        const processedFiles = [];
        for (const file of files) {
          const processedFile = await this.processFile(file, options);
          processedFiles.push(processedFile);
        }
        
        return processedFiles;
      } catch (error) {
        console.error("Error processing multiple files:", error);
        throw error;
      }
    }
    
    // Upload remote PDFs (enhanced with categorization)
    async uploadRemotePDF(url, displayName, options = {}) {
      try {
        console.log(`Preparing to fetch PDF from URL: ${url}`);
        
        // Verify API connectivity first
        await this.verifyGeminiConnection();
        
        // Create a unique ID
        let fileId = `file_url_${Date.now()}_${displayName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        // Determine category
        const category = this.determineCategory({ name: displayName }, options);
        
        // Generate GCP path
        const gcpPath = this.generateGcpPath({ name: displayName }, category);
        
        // Initialize in cache
        this.fileCache.set(fileId, {
          id: fileId,
          name: displayName,
          type: 'application/pdf',
          size: 0, // Will update once we have the file
          uploadTime: new Date(),
          status: 'downloading',
          useFileApi: true,
          category: category,
          gcpPath: gcpPath,
          uploadContext: options
        });
        
        // Use the proxy endpoint to fetch the PDF
        const proxyUrl = `${this.proxyEndpoint}?url=${encodeURIComponent(url)}`;
        console.log(`Fetching PDF via proxy: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        const pdfBuffer = await response.arrayBuffer();
        const fileBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
        
        // Update file size in cache
        let cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.size = fileBlob.size;
          cachedFile.status = 'uploading_gemini';
          this.fileCache.set(fileId, cachedFile);
        }
        
        console.log(`Successfully fetched PDF (${this.formatFileSize(fileBlob.size)}) for ${displayName}`);
        
        // Now proceed with Gemini upload
        const uploadedFile = await this.genAI.files.upload({
          file: fileBlob,
          config: {
            displayName: displayName,
          },
        });
        
        // Update status
        cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.status = 'processing_gemini';
          cachedFile.geminiFileId = uploadedFile.name;
          this.fileCache.set(fileId, cachedFile);
        }
        
        // Wait for processing
        let getFile = await this.genAI.files.get({ name: uploadedFile.name });
        let processingCount = 0;
        
        while (getFile.state === 'PROCESSING') {
          processingCount++;
          
          // Update progress
          cachedFile = this.fileCache.get(fileId);
          if (cachedFile) {
            cachedFile.processingProgress = processingCount;
            this.fileCache.set(fileId, cachedFile);
          }
          
          await new Promise((resolve) => {
            setTimeout(resolve, 5000);
          });
          
          getFile = await this.genAI.files.get({ name: uploadedFile.name });
          console.log(`Current file status: ${getFile.state} (check #${processingCount})`);
        }
        
        if (getFile.state === 'FAILED') {
          throw new Error('File processing failed.');
        }
        
        // Update final status
        cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.status = 'processed';
          cachedFile.geminiFile = {
            name: getFile.name,
            uri: getFile.uri,
            mimeType: getFile.mimeType,
            state: getFile.state,
            displayName: getFile.displayName
          };
          this.fileCache.set(fileId, cachedFile);
        }
        
        // Also upload to GCS for document vault integration
        await this.uploadFileToGCS(fileBlob, fileId, getFile, category);
        
        return getFile;
      } catch (error) {
        console.error('Error uploading file from URL:', error);
        throw error;
      }
    }
    
    // FIXED: Process a file for upload with proper error handling and logging
    async processFile(file, options = {}) {
      try {
        console.log(`Starting to process file: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})`);
        
        // Validate file type
        if (!this.isSupportedFileType(file.type)) {
          throw new Error(`File type '${file.type}' is not supported. Supported types include PDF, Word, Excel, CSV, and common image formats.`);
        }
        
        // Validate file size
        if (file.size > this.maxFileSize) {
          throw new Error(`File is too large (${this.formatFileSize(file.size)}). Maximum allowed size is ${this.formatFileSize(this.maxFileSize)}.`);
        }
        
        // Create a unique ID for the file
        const fileId = `file_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        // Determine the appropriate category with enhanced logging
        console.log(`Determining category for file: ${file.name}`);
        const category = this.determineCategory(file, options);
        console.log(`Category determined for ${file.name}: ${category}`);
        
        // Generate GCP path
        const gcpPath = this.generateGcpPath(file, category);
        
        // Initialize file data
        const fileData = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadTime: new Date(),
          status: 'queued',
          queuedTime: Date.now(),
          category: category,
          gcpPath: gcpPath,
          uploadContext: options
        };
        
        // Add to cache immediately so UI can show queued status
        this.fileCache.set(fileId, fileData);
        console.log(`File ${fileId} added to cache with queued status`);
        
        // Add to processing queue and start processing
        return new Promise((resolve) => {
          // Add the file to the upload queue with the resolve function
          this.uploadQueue.push({
            file,
            fileId,
            category,
            options,
            resolve
          });
          
          console.log(`File ${fileId} added to upload queue, current queue length: ${this.uploadQueue.length}`);
          
          // Start processing the queue if not already running
          if (!this.processingPromise) {
            console.log('Starting queue processing');
            this.processingPromise = this.processQueue();
          } else {
            console.log('Queue processing already running');
          }
          
          // Return a reference immediately so UI can track progress
          resolve({
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            status: 'queued',
            category: category,
            gcpPath: gcpPath
          });
        });
      } catch (error) {
        console.error(`Error preparing file ${file.name} for processing:`, error);
        throw error;
      }
    }
    
    // FIXED: Process the queue with proper await handling
    async processQueue() {
      try {
        // Safety check - don't start a new queue processing if one is already running
        if (this._isProcessingQueue) {
          console.log("Queue processing already in progress, skipping");
          return;
        }
        
        this._isProcessingQueue = true;
        console.log(`Starting queue processing, queue length: ${this.uploadQueue.length}, active uploads: ${this.activeUploads}`);
        
        while (this.uploadQueue.length > 0) {
          // Check if we've reached the concurrent upload limit
          if (this.activeUploads >= this.maxConcurrentUploads) {
            console.log(`Reached maximum concurrent uploads (${this.activeUploads}/${this.maxConcurrentUploads}), waiting...`);
            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          // Get next file from queue
          const { file, fileId, category, options, resolve } = this.uploadQueue.shift();
          
          console.log(`Processing file ${file.name} (${fileId}) from queue, current active uploads: ${this.activeUploads}`);
          
          // Increment active uploads counter before processing
          this.activeUploads++;
          
          // Update status in cache
          const fileData = this.fileCache.get(fileId);
          if (fileData) {
            fileData.status = 'processing';
            this.fileCache.set(fileId, fileData);
          }
          
          try {
            // Process the file and wait for it to complete
            await this.processFileInternal(file, fileId, category, options);
            console.log(`File ${fileId} processed successfully`);
          } catch (error) {
            console.error(`Error processing file ${fileId}:`, error);
            
            // Update with error status
            const fileData = this.fileCache.get(fileId);
            if (fileData) {
              fileData.status = 'error';
              fileData.error = error.message;
              fileData.errorDetails = error.stack;
              this.fileCache.set(fileId, fileData);
            }
          } finally {
            // Always decrement the active uploads counter
            this.activeUploads--;
            console.log(`Completed processing file ${fileId}, active uploads now: ${this.activeUploads}`);
          }
        }
        
        console.log("Queue processing completed");
      } catch (error) {
        console.error("Error in queue processing:", error);
      } finally {
        this._isProcessingQueue = false;
        this.processingPromise = null;
        
        // Check if new items were added to the queue while we were processing
        if (this.uploadQueue.length > 0) {
          console.log(`Found ${this.uploadQueue.length} new items in queue, restarting processing`);
          this.processingPromise = this.processQueue();
        }
      }
    }
    
    // FIXED: Internal processing for files with proper error handling
    async processFileInternal(file, fileId, category, options = {}, retryCount = 0) {
      console.log(`processFileInternal started for ${fileId} (${file.name})`);
      try {
        let fileData = this.fileCache.get(fileId);
        if (!fileData) {
          throw new Error(`File data not found in cache for ID: ${fileId}`);
        }

        // Ensure category is set
        if (!category && (!fileData.category || fileData.category === 'others')) {
          console.log(`Recategorizing file ${file.name} as it was marked as 'others' or missing category`);
          const newCategory = this.determineCategory(file, options);
          console.log(`New category for ${file.name}: ${newCategory}`);
          fileData.category = newCategory;
        } else {
          fileData.category = category || fileData.category;
        }
        
        // Update status to processing
        fileData.status = 'processing';
        fileData.processingStartTime = Date.now();
        this.fileCache.set(fileId, fileData);
        console.log(`Status updated to 'processing' for file ${fileId}`);
        
        // Determine the appropriate upload method based on file type and size
        let uploadResult;
        if (file.type === 'application/pdf' || file.size > this.fileApiThreshold) {
          console.log(`Using Gemini File API for ${file.name} (${this.formatFileSize(file.size)})`);
          fileData.status = 'uploading_gemini';
          fileData.useFileApi = true;
          this.fileCache.set(fileId, fileData);
          
          // Use optimized large file upload method
          const geminiFileData = await this.uploadLargeFileToGemini(file, fileId);
          console.log(`Gemini upload complete for ${fileId}, now uploading to GCS`);
          
          // Upload to GCS as well
          await this.uploadFileToGCS(file, fileId, geminiFileData, fileData.category);
          console.log(`GCS upload complete for ${fileId}`);
          
          uploadResult = geminiFileData;
          
          // Update with success status
          fileData = this.fileCache.get(fileId);
          if (fileData) {
            fileData.geminiFile = geminiFileData;
            fileData.status = 'processed';
            fileData.uploaded = true;
            fileData.processingEndTime = Date.now();
            fileData.processingDuration = fileData.processingEndTime - (fileData.processingStartTime || fileData.processingEndTime);
            this.fileCache.set(fileId, fileData);
          }
        } else {
          // Small non-PDF file: Use regular upload approach
          console.log(`Using regular upload for smaller file ${file.name} (${this.formatFileSize(file.size)})`);
          fileData.status = 'reading';
          this.fileCache.set(fileId, fileData);
          
          // Read file content
          fileData.content = await this.readFileAsDataURL(file);
          fileData.useFileApi = false;
          fileData.status = 'uploading';
          this.fileCache.set(fileId, fileData);
          
          // Upload to server with category info
          const uploadResponse = await this.uploadFileToServer(file, fileId, fileData.category);
          console.log(`Server upload complete for ${fileId}`);
          
          uploadResult = uploadResponse;
          
          // Update with success status
          fileData = this.fileCache.get(fileId);
          if (fileData) {
            fileData.status = 'uploaded';
            fileData.uploaded = true;
            fileData.serverResponse = uploadResponse;
            fileData.processingEndTime = Date.now();
            fileData.processingDuration = fileData.processingEndTime - (fileData.processingStartTime || fileData.processingEndTime);
            this.fileCache.set(fileId, fileData);
          }
        }
        
        console.log(`File ${fileId} (${file.name}) successfully processed`);
        return uploadResult;
      } catch (error) {
        console.error(`Error in processFileInternal for file ${fileId} (${file.name}):`, error);
        
        // Check if we should retry
        if (retryCount < this.maxRetries) {
          console.log(`Retrying upload for ${fileId} (${file.name}), attempt ${retryCount + 1}/${this.maxRetries}`);
          
          // Update retry status
          const fileData = this.fileCache.get(fileId);
          if (fileData) {
            fileData.status = 'retrying';
            fileData.retryCount = (fileData.retryCount || 0) + 1;
            fileData.lastError = error.message;
            this.fileCache.set(fileId, fileData);
          }
          
          // Exponential backoff
          const delay = this.retryDelayMs * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry
          return this.processFileInternal(file, fileId, category, options, retryCount + 1);
        }
        
        // Update file status to error if we've exhausted retries
        const fileData = this.fileCache.get(fileId);
        if (fileData) {
          fileData.status = 'error';
          fileData.error = error.message;
          fileData.errorDetails = error.stack;
          fileData.processingEndTime = Date.now();
          fileData.processingDuration = fileData.processingEndTime - (fileData.processingStartTime || fileData.processingEndTime);
          this.fileCache.set(fileId, fileData);
        }
        
        throw error;
      }
    }
    
    // Optimized method for large file uploads to Gemini (unchanged)
    async uploadLargeFileToGemini(file, fileId) {
      console.log(`Starting large file upload for ${file.name} (${this.formatFileSize(file.size)})`);
      
      try {
        // Update status in cache
        let cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.status = 'preparing_upload';
          this.fileCache.set(fileId, cachedFile);
        }
        
        // For very large files, create blob more efficiently
        let fileBlob;
        if (file.size > 30 * 1024 * 1024) { // Over 30MB, use arrayBuffer
          console.log(`Using arrayBuffer approach for large file: ${file.name}`);
          const arrayBuffer = await file.arrayBuffer();
          fileBlob = new Blob([arrayBuffer], { type: file.type });
        } else {
          fileBlob = new Blob([file], { type: file.type });
        }
        
        // Update status
        cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.status = 'uploading_gemini';
          cachedFile.uploadStartTime = Date.now();
          this.fileCache.set(fileId, cachedFile);
        }
        
        console.log(`Uploading file ${file.name} to Gemini File API...`);
        
        // Upload with timeout protection
        const uploadPromise = this.genAI.files.upload({
          file: fileBlob,
          config: {
            displayName: file.name,
          },
        });
        
        // Add timeout protection
        const uploadedFile = await Promise.race([
          uploadPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Upload timeout after ${this.uploadTimeoutMs/1000} seconds`)), 
            this.uploadTimeoutMs)
          )
        ]);
        
        console.log('File uploaded to Gemini, now waiting for processing:', uploadedFile);
        
        // Update status for processing phase
        cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.status = 'processing_gemini';
          cachedFile.geminiFileId = uploadedFile.name;
          cachedFile.uploadEndTime = Date.now();
          this.fileCache.set(fileId, cachedFile);
        }
        
        // Wait for processing to complete with improved handling
        let getFile;
        let processingStartTime = Date.now();
        let stateCheckCount = 0;
        
        // Initial file status check
        getFile = await this.genAI.files.get({ name: uploadedFile.name });
        
        while (getFile.state === 'PROCESSING') {
          stateCheckCount++;
          
          // Update processing progress
          cachedFile = this.fileCache.get(fileId);
          if (cachedFile) {
            cachedFile.processingProgress = stateCheckCount;
            cachedFile.currentState = getFile.state;
            this.fileCache.set(fileId, cachedFile);
          }
          
          // Check for timeout
          if (Date.now() - processingStartTime > this.processingTimeoutMs) {
            throw new Error(`Processing timeout after ${this.processingTimeoutMs/1000} seconds`);
          }
          
          // Adaptive waiting: start with 5s, increase for longer processing times
          const waitTime = (Date.now() - processingStartTime > 60000) ? 10000 : 5000;
          console.log(`File is still processing (check #${stateCheckCount}), checking again in ${waitTime/1000}s`);
          
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          
          // Get updated status
          getFile = await this.genAI.files.get({ name: uploadedFile.name });
        }
        
        if (getFile.state === 'FAILED') {
          throw new Error('File processing failed on Gemini server');
        }
        
        console.log(`File processing completed successfully after ${stateCheckCount} status checks`);
        
        // Return the processed file data
        return {
          name: getFile.name,
          uri: getFile.uri,
          mimeType: getFile.mimeType,
          state: getFile.state,
          displayName: getFile.displayName
        };
      } catch (error) {
        console.error('Gemini File API error:', error);
        throw error;
      }
    }
    
    // Original method (kept for compatibility but enhanced)
    async uploadToGeminiFileApi(originalFile, fileId) {
      console.log('Using uploadLargeFileToGemini instead of uploadToGeminiFileApi for better reliability');
      return this.uploadLargeFileToGemini(originalFile, fileId);
    }
    
    // Create a Gemini File Part (unchanged)
    createFilePartForAPI(fileId) {
      const cachedFile = this.fileCache.get(fileId);
      if (!cachedFile || !cachedFile.geminiFile) {
        throw new Error('File not found or not processed through Gemini API');
      }
      
      const { uri, mimeType } = cachedFile.geminiFile;
      if (!uri || !mimeType) {
        throw new Error('File URI or MIME type missing');
      }
      
      return createPartFromUri(uri, mimeType);
    }
    
    // Upload file to the server endpoint (enhanced with category)
    async uploadFileToServer(file, fileId, category, retryCount = 0) {
      try {
        console.log(`Uploading file to ${this.uploadEndpoint}...`);
        
        // Create FormData for the file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileId', fileId);
        formData.append('fileName', file.name);
        formData.append('fileType', file.type);
        
        // Add category information
        if (category) {
          formData.append('category', category);
          formData.append('gcpFolder', this.getGcsFolderName(category));
        }
        
        // Upload to the server with better progress tracking
        const response = await axios.post(this.uploadEndpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          // Extended timeout for larger files
          timeout: this.uploadTimeoutMs,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            
            // Update the file in cache with progress info
            const cachedFile = this.fileCache.get(fileId);
            if (cachedFile) {
              cachedFile.uploadProgress = percentCompleted;
              
              // Calculate estimated time remaining
              if (!cachedFile.uploadStartTime) {
                cachedFile.uploadStartTime = Date.now();
              } else if (percentCompleted > 0) {
                const elapsedMs = Date.now() - cachedFile.uploadStartTime;
                const estimatedTotalMs = (elapsedMs / percentCompleted) * 100;
                cachedFile.estimatedTimeRemainingMs = estimatedTotalMs - elapsedMs;
              }
              
              this.fileCache.set(fileId, cachedFile);
            }
          }
        });
        
        // Update cache with completion time
        const cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.uploadEndTime = Date.now();
          cachedFile.uploadDuration = cachedFile.uploadEndTime - (cachedFile.uploadStartTime || cachedFile.uploadEndTime);
          this.fileCache.set(fileId, cachedFile);
        }
        
        console.log('File upload successful:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error uploading file to server:', error);
        
        // Enhanced retry with more context
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, retryCount);
          console.log(`Retrying upload for ${fileId} (${file.name}), attempt ${retryCount + 1}/${this.maxRetries} after ${delay}ms`);
          
          // Update retry status
          const cachedFile = this.fileCache.get(fileId);
          if (cachedFile) {
            cachedFile.retryCount = retryCount + 1;
            cachedFile.lastError = error.message;
            this.fileCache.set(fileId, cachedFile);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.uploadFileToServer(file, fileId, category, retryCount + 1);
        }
        
        throw new Error(`Server upload failed after ${this.maxRetries} attempts: ${error.message}`);
      }
    }
  
    // Enhanced uploadFileToGCS method with category support
    async uploadFileToGCS(file, fileId, geminiFileData, category) {
      try {
        console.log(`Uploading file ${fileId} to GCS for tracking...`);
        
        // Create FormData for the file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileId', fileId);
        formData.append('fileName', typeof file.name === 'string' ? file.name : fileId);
        formData.append('fileType', typeof file.type === 'string' ? file.type : 'application/octet-stream');
        
        // Add Gemini metadata
        formData.append('geminiFileId', geminiFileData.name);
        formData.append('geminiFileUri', geminiFileData.uri);
        formData.append('geminiFileMimeType', geminiFileData.mimeType);
        formData.append('geminiFileState', geminiFileData.state);
        
        // Add category information
        if (category) {
          formData.append('category', category);
          formData.append('gcpFolder', this.getGcsFolderName(category));
        }
        
        // Track processing in cache
        const cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.status = 'uploading_to_gcs';
          this.fileCache.set(fileId, cachedFile);
        }
        
        // Upload to GCS via the same upload endpoint
        const response = await axios.post(this.uploadEndpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: this.uploadTimeoutMs
        });
        
        console.log('GCS upload successful:', response.data);
        
        // Update cache
        if (cachedFile) {
          cachedFile.gcsUploaded = true;
          cachedFile.gcsResponse = response.data;
          this.fileCache.set(fileId, cachedFile);
        }
        
        return response.data;
      } catch (error) {
        console.error('Error uploading to GCS:', error);
        
        // Mark GCS upload failed but don't fail the whole process
        // since we already have it in Gemini
        const cachedFile = this.fileCache.get(fileId);
        if (cachedFile) {
          cachedFile.gcsUploaded = false;
          cachedFile.gcsError = error.message;
          this.fileCache.set(fileId, cachedFile);
        }
        
        // Don't throw - we'll consider it a partial success since it's in Gemini
        console.warn(`File uploaded to Gemini but GCS upload failed: ${error.message}`);
      }
    }
  
    // Utility methods (mostly unchanged)
    isSupportedFileType(mimeType) {
      if (!mimeType) return false;
      
      // Check known MIME types
      if (this.supportedTypes[mimeType]) return true;
      
      // Check MIME type categories
      if (mimeType.startsWith('image/')) return true;
      if (mimeType.startsWith('text/')) return true;
      if (mimeType.startsWith('application/pdf')) return true;
      if (mimeType.includes('document')) return true;
      if (mimeType.includes('spreadsheet')) return true;
      
      return false;
    }
  
    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          resolve(event.target.result);
        };
        
        reader.onerror = (error) => {
          reject(error);
        };
        
        reader.readAsDataURL(file);
      });
    }
  
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          resolve(event.target.result);
        };
        
        reader.onerror = (error) => {
          reject(error);
        };
        
        reader.readAsText(file);
      });
    }
    
    saveCachedFiles() {
      try {
        // Only save metadata, not file contents
        const filesToSave = Array.from(this.fileCache.entries()).map(([id, fileData]) => {
          // Extract metadata excluding file content
          const { content, ...metadata } = fileData;
          return [id, metadata];
        });
        
        localStorage.setItem('fileUploadCache', JSON.stringify(filesToSave));
      } catch (e) {
        console.warn('Could not save file cache to localStorage:', e);
      }
    }
  
    loadCachedFiles() {
      try {
        const savedCache = localStorage.getItem('fileUploadCache');
        if (savedCache) {
          const parsedCache = JSON.parse(savedCache);
          parsedCache.forEach(([id, metadata]) => {
            // Restore with needs_reupload status for incomplete uploads
            const needsReupload = ['queued', 'processing', 'uploading', 'retrying', 'uploading_gemini', 'processing_gemini'].includes(metadata.status);
            
            this.fileCache.set(id, {
              ...metadata,
              status: needsReupload ? 'needs_reupload' : metadata.status
            });
          });
        }
      } catch (e) {
        console.warn('Could not load file cache from localStorage:', e);
      }
    }
  
    getFile(fileId) {
      return this.fileCache.get(fileId);
    }
  
    getAllFiles() {
      return Array.from(this.fileCache.values());
    }
    
    // NEW: Get files by category
    getFilesByCategory(category) {
      return this.getAllFiles().filter(file => file.category === category);
    }
    
    getFilesByStatus(status) {
      return this.getAllFiles().filter(file => file.status === status);
    }
  
    clearFile(fileId) {
      this.fileCache.delete(fileId);
    }
  
    clearAllFiles() {
      this.fileCache.clear();
      localStorage.removeItem('fileUploadCache');
    }
  
    // Enhanced getFileDisplayInfo to include category information
    getFileDisplayInfo(fileId) {
      const file = this.fileCache.get(fileId);
      if (!file) return null;
      
      return {
        id: file.id,
        name: file.name,
        type: file.type,
        size: this.formatFileSize(file.size),
        icon: this.getFileIcon(file.type),
        uploadTime: file.uploadTime,
        status: file.status || 'unknown',
        useFileApi: file.useFileApi || false,
        geminiFileInfo: file.geminiFile,
        uploadProgress: file.uploadProgress || 0,
        processingProgress: file.processingProgress || 0,
        retryCount: file.retryCount || 0,
        error: file.error || file.uploadError,
        errorDetails: file.errorDetails,
        localOnly: file.localOnly || false,
        queuePosition: this.getQueuePosition(fileId),
        estimatedTimeRemaining: file.estimatedTimeRemainingMs ? 
          this.formatTimeRemaining(file.estimatedTimeRemainingMs) : null,
        // Add category information
        category: file.category || 'others',
        gcpPath: file.gcpPath,
        uploadContext: file.uploadContext,
        criticalDocName: file.uploadContext?.documentName
      };
    }
    
    // Format estimated time remaining
    formatTimeRemaining(ms) {
      if (ms < 1000) return 'less than a second';
      if (ms < 60000) return `${Math.round(ms/1000)} seconds`;
      return `${Math.round(ms/60000)} minutes`;
    }
    
    getQueuePosition(fileId) {
      const index = this.uploadQueue.findIndex(item => item.fileId === fileId);
      return index === -1 ? null : index + 1;
    }
  
    getFileIcon(fileType) {
      if (!fileType) return '📎';
      
      if (fileType.includes('pdf')) return '📄';
      if (fileType.includes('word') || fileType.includes('document')) return '📝';
      if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('csv')) return '📊';
      if (fileType.includes('image')) return '🖼️';
      if (fileType.includes('audio')) return '🔊';
      if (fileType.includes('video')) return '🎬';
      if (fileType.includes('text')) return '📃';
      if (fileType.includes('json')) return '{ }';
      if (fileType.includes('html') || fileType.includes('xml')) return '🌐';
      
      return '📎';
    }
  
    formatFileSize(bytes) {
      if (bytes === undefined || bytes === null) return '0 bytes';
      
      if (bytes < 1024) return bytes + ' bytes';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
    
    // NEW: Get category label for display
    getCategoryLabel(category) {
      const categoryMap = {
        'corporate-docs': 'Corporate Documentation',
        'property-docs': 'Property Documentation',
        'legal-compliance': 'Legal & Compliance',
        'contract-docs': 'Contract Documentation',
        'facility-docs': 'Facility Documentation',
        'energy-docs': 'Energy Documentation',
        'technical-docs': 'Technical Documentation',
        'operations-docs': 'Operations Documentation',
        'security-docs': 'Security Documentation',
        'risk-management': 'Risk Management',
        'customer-docs': 'Customer Documentation',
        'training-docs': 'Training Documentation',
        'health-safety': 'Health & Safety',
        'environmental': 'Environmental',
        'others': 'Other Documents'
      };
      
      return categoryMap[category] || 'Other Documents';
    }
  
    async extractTextContent(fileId) {
      const file = this.fileCache.get(fileId);
      if (!file) return null;
      
      try {
        if (file.useFileApi && file.geminiFile) {
          return `[File processed by Gemini: ${file.name}]`;
        }
        
        if (file.type.includes('text') || file.type.includes('csv')) {
          return `Content of ${file.name}:\n${await this.readFileAsText(file)}`;
        } else {
          return `[File: ${file.name} (${file.type}) - ${this.formatFileSize(file.size)}]`;
        }
      } catch (error) {
        console.error("Error extracting text from file:", error);
        return `[Error extracting content from ${file.name}]`;
      }
    }
    
    async createGeminiPrompt(prompt, fileIds) {
      const contents = [{ text: prompt }];
      
      for (const fileId of fileIds) {
        const fileData = this.fileCache.get(fileId);
        
        if (!fileData) {
          throw new Error(`File with ID ${fileId} not found`);
        }
        
        if (fileData.useFileApi && fileData.geminiFile) {
          const filePart = createPartFromUri(fileData.geminiFile.uri, fileData.geminiFile.mimeType);
          contents.push(filePart);
        } else if (fileData.content) {
          const base64Data = fileData.content.split(',')[1];
          
          contents.push({
            inlineData: {
              mimeType: fileData.type,
              data: base64Data
            }
          });
        } else {
          throw new Error(`File ${fileId} is not ready for content generation`);
        }
      }
      
      return contents;
    }
    
    async generateContent(prompt, fileIds, modelName = 'gemini-2.0-flash') {
      try {
        // Always verify API connectivity first
        await this.verifyGeminiConnection();
        
        const contents = await this.createGeminiPrompt(prompt, fileIds);
        
        // Call Gemini API with proper error handling
        const response = await this.genAI.models.generateContent({
          model: modelName,
          contents: contents
        });
        
        return response;
      } catch (error) {
        console.error('Error generating content:', error);
        throw error;
      }
    }

    // Generate content with documents (unchanged)
    async generateContentWithDocuments(prompt, fileIds) {
      // Verify API connectivity first
      await this.verifyGeminiConnection();
      
      // Create content array starting with the prompt text
      const content = [{ text: prompt }];
      
      // For each fileId, add the file to content
      for (const fileId of fileIds) {
        const fileData = this.fileCache.get(fileId);
        
        if (!fileData || !fileData.geminiFile) {
          throw new Error(`File ${fileId} not found or not processed through Gemini API`);
        }
        
        if (fileData.geminiFile.uri && fileData.geminiFile.mimeType) {
          const fileContent = createPartFromUri(fileData.geminiFile.uri, fileData.geminiFile.mimeType);
          content.push(fileContent);
        }
      }
      
      // Generate content with better error handling
      try {
        const response = await this.genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: content,
        });
        
        return response;
      } catch (error) {
        console.error("Generate content error:", error);
        throw new Error(`Failed to generate content: ${error.message}`);
      }
    }
}
  
// Export as singleton
const fileUploadService = new FileUploadService();
export default fileUploadService;