import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// FileUploadButton component
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

// PRODUCTION INTEGRATION: Import FileUploadService
// Note: In your actual implementation, ensure FileUploadService.js is in the correct path
// import fileUploadService from '../services/FileUploadService';

// DEMO MODE: Mock FileUploadService for demonstration
// In production, remove this mock and use the real import above
const mockFileUploadService = {
  processFile: async (file, options = {}) => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate real upload process
    const result = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'processing',
      category: options.category || 'others',
      uploadTime: new Date().toISOString()
    };
    
    // Simulate processing time
    setTimeout(() => {
      result.status = 'processed';
    }, 2000 + Math.random() * 3000);
    
    return result;
  },
  
  getFileDisplayInfo: (fileId) => ({
    id: fileId,
    uploadProgress: Math.floor(Math.random() * 100),
    status: ['processing', 'uploaded', 'processed'][Math.floor(Math.random() * 3)]
  }),
  
  determineCategory: (file, options = {}) => {
    const { workflow, category } = options;
    if (category) return category;
    
    const fileName = file.name.toLowerCase();
    if (/energy|power|efficiency/.test(fileName)) return 'energy-docs';
    if (/security|access/.test(fileName)) return 'security-docs';
    if (/legal|compliance/.test(fileName)) return 'legal-compliance';
    if (/environment|sustainability/.test(fileName)) return 'environmental';
    return 'others';
  }
};

// Use mock in demo mode, real service in production
const fileUploadService = mockFileUploadService;

const DataValidation = () => {
  // ==================== ENHANCED STATE MANAGEMENT ====================
  
  // Original states
  const [activeTab, setActiveTab] = useState('documents');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [showComplianceMap, setShowComplianceMap] = useState(false);
  const [mappingDocument, setMappingDocument] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [showFrameworkDetails, setShowFrameworkDetails] = useState(false);
  const [selectedFrameworkDetails, setSelectedFrameworkDetails] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  
  // ENHANCED FEATURES - Multi-site and filtering states
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [tagFilter, setTagFilter] = useState([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [customTags, setCustomTags] = useState([]);
  
  // PRODUCTION INTEGRATION: Upload states
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [vaultCategoriesWithUploads, setVaultCategoriesWithUploads] = useState([]);
  const [needsCategoryRefresh, setNeedsCategoryRefresh] = useState(false);

  // ==================== COMPLETE DATA STRUCTURES ====================

  // Site hierarchy structure - PRODUCTION READY
  const siteHierarchy = useMemo(() => [
    { 
      id: 'all', 
      name: 'All Sites', 
      level: 'global',
      children: [
        {
          id: 'global',
          name: 'Global Corporate',
          level: 'global',
          children: []
        },
        {
          id: 'americas',
          name: 'Americas Region',
          level: 'region',
          children: [
            { id: 'us-dc-ashburn', name: 'US-DC-Ashburn', level: 'site', lat: 39.0458, lng: -77.4874 },
            { id: 'us-dc-chicago', name: 'US-DC-Chicago', level: 'site', lat: 41.8781, lng: -87.6298 },
            { id: 'us-dc-dallas', name: 'US-DC-Dallas', level: 'site', lat: 32.7767, lng: -96.7970 }
          ]
        },
        {
          id: 'emea',
          name: 'EMEA Region', 
          level: 'region',
          children: [
            { id: 'eu-dc-hamburg', name: 'EU-DC-Hamburg', level: 'site', lat: 53.5511, lng: 9.9937 },
            { id: 'eu-dc-paris', name: 'EU-DC-Paris', level: 'site', lat: 48.8566, lng: 2.3522 },
            { id: 'eu-dc-london', name: 'EU-DC-London', level: 'site', lat: 51.5074, lng: -0.1278 },
            { id: 'eu-dc-amsterdam', name: 'EU-DC-Amsterdam', level: 'site', lat: 52.3676, lng: 4.9041 }
          ]
        },
        {
          id: 'apac',
          name: 'APAC Region',
          level: 'region', 
          children: [
            { id: 'sg-dc-singapore', name: 'SG-DC-Singapore', level: 'site', lat: 1.3521, lng: 103.8198 },
            { id: 'jp-dc-tokyo', name: 'JP-DC-Tokyo', level: 'site', lat: 35.6762, lng: 139.6503 },
            { id: 'au-dc-sydney', name: 'AU-DC-Sydney', level: 'site', lat: -33.8688, lng: 151.2093 }
          ]
        }
      ]
    }
  ], []);

  // Lifecycle phases mapping - PRODUCTION READY
  const lifecyclePhases = useMemo(() => [
    { id: 'phase-1-plan', name: '1. Plan / Feasibility', color: '#dc2626' },
    { id: 'phase-2-design', name: '2. Design / Engineering', color: '#7c3aed' },
    { id: 'phase-3-build', name: '3. Build / Commissioning', color: '#ea580c' },
    { id: 'phase-4-operate', name: '4. Operate / Maintain', color: '#0ea5e9' },
    { id: 'phase-5-optimize', name: '5. Optimize / Audit', color: '#10b981' },
    { id: 'phase-6-decommission', name: '6. Decommission', color: '#6b7280' }
  ], []);

  // Framework and standards data - ENHANCED
  const frameworks = useMemo(() => [
    { id: "taxonomy", name: "EU Taxonomy", baseProgress: 78, description: "Environmental sustainability classification system", documents: 4, questions: 6, requiredDocs: 8 },
    { id: "eed", name: "Energy Efficiency Directive", baseProgress: 92, description: "Energy efficiency requirements", documents: 6, questions: 3, requiredDocs: 6 },
    { id: "coc", name: "EU Code of Conduct", baseProgress: 88, description: "Data center energy efficiency best practices", documents: 5, questions: 4, requiredDocs: 5 },
    { id: "iso14001", name: "ISO 14001 (EMS)", baseProgress: 85, description: "Environmental Management Systems", documents: 3, questions: 5, requiredDocs: 7 },
    { id: "iso27001", name: "ISO 27001 (ISMS)", baseProgress: 78, description: "Information Security Management", documents: 4, questions: 8, requiredDocs: 9 },
    { id: "iso9001", name: "ISO 9001 (QMS)", baseProgress: 90, description: "Quality Management Systems", documents: 2, questions: 4, requiredDocs: 6 }
  ], []);

  // COMPLETE ORIGINAL DOCUMENT VAULT CATEGORIES - RESTORED
  const documentCategories = useMemo(() => [
    {
      id: "design",
      name: "1. Design & Construction Documentation",
      progress: 65,
      phase: 'phase-2-design',
      documents: [
        {
          id: "annual-report",
          name: "Equinix-Inc_2023_Annual-Report.pdf",
          type: "PDF",
          size: "5.4 MB",
          uploadDate: "2023-05-23",
          status: "complete",
          frameworks: ["taxonomy", "eed"],
          questionCount: 4,
          tags: {
            location: ['global'],
            phase: ['phase-1-plan', 'phase-5-optimize'],
            content: ['annual_report', 'financial', 'sustainability'],
            version: ['latest']
          }
        },
        {
          id: "floor-plans",
          name: "Floor-Plans-2023.pdf",
          type: "PDF",
          size: "2.3 MB",
          uploadDate: "2023-06-05",
          status: "complete",
          frameworks: ["eed", "coc"],
          questionCount: 2,
          tags: {
            location: ['us-dc-ashburn'],
            phase: ['phase-2-design'],
            content: ['facility_design', 'technical'],
            version: ['latest']
          }
        },
        {
          id: "iso-certification",
          name: "ISO-14001-Certification-2023.pdf",
          type: "PDF",
          size: "3.2 MB",
          uploadDate: "2023-04-15",
          status: "complete",
          frameworks: ["iso14001", "iso9001"],
          questionCount: 5,
          tags: {
            location: ['global'],
            phase: ['phase-4-operate'],
            content: ['environmental', 'governance'],
            version: ['latest']
          }
        }
      ]
    },
    {
      id: "operational",
      name: "2. Operational & Maintenance Documentation",
      progress: 40,
      phase: 'phase-4-operate',
      documents: [
        {
          id: "dc-specs",
          name: "Data-Center-Specifications.pdf",
          type: "PDF",
          size: "4.5 MB",
          uploadDate: "2023-04-30",
          status: "complete",
          frameworks: ["coc"],
          questionCount: 6,
          tags: {
            location: ['eu-dc-hamburg'],
            phase: ['phase-4-operate'],
            content: ['technical', 'operational'],
            version: ['latest']
          }
        },
        {
          id: "sops",
          name: "Standard-Operating-Procedures.docx",
          type: "DOCX",
          size: "1.2 MB",
          uploadDate: "2023-06-18",
          status: "review",
          frameworks: ["iso9001"],
          questionCount: 3,
          tags: {
            location: ['global'],
            phase: ['phase-4-operate'],
            content: ['governance', 'operational'],
            version: ['draft']
          }
        }
      ]
    },
    {
      id: "energy",
      name: "3. Energy & Environmental Documentation",
      progress: 80,
      phase: 'phase-5-optimize',
      documents: [
        {
          id: "sustainability-report",
          name: "Equinix-Inc_2023-Sustainability-Report.pdf",
          type: "PDF",
          size: "7.2 MB",
          uploadDate: "2023-06-12",
          status: "complete",
          frameworks: ["taxonomy", "coc", "eed"],
          questionCount: 12,
          tags: {
            location: ['global'],
            phase: ['phase-5-optimize'],
            content: ['environmental', 'sustainability', 'annual_report'],
            version: ['latest']
          }
        }
      ]
    }
  ], []);

  // COMPLETE ORIGINAL VAULT CATEGORIES - RESTORED AND ENHANCED
  const vaultCategories = useMemo(() => [
    {
      id: "corporate-docs",
      name: "1. Corporate Documentation",
      phase: 'phase-1-plan',
      documents: [
        { id: "annual-report-1", name: "Annual Reports.pdf", type: "PDF", size: "8.2 MB", uploadDate: "2023-04-15", tags: { location: ['global'], phase: ['phase-1-plan'], content: ['annual_report'], version: ['latest'] } },
        { id: "sustainability-report-1", name: "Sustainability Reports.pdf", type: "PDF", size: "5.5 MB", uploadDate: "2023-05-10", tags: { location: ['global'], phase: ['phase-5-optimize'], content: ['sustainability'], version: ['latest'] } },
        { id: "governance-docs", name: "Corporate Governance Documents.pdf", type: "PDF", size: "3.7 MB", uploadDate: "2023-03-22", tags: { location: ['global'], phase: ['phase-1-plan'], content: ['governance'], version: ['latest'] } },
        { id: "strategic-plans", name: "Strategic Plans.pdf", type: "PDF", size: "4.1 MB", uploadDate: "2023-06-05", tags: { location: ['global'], phase: ['phase-1-plan'], content: ['governance'], version: ['latest'] } },
        { id: "shareholder-comms", name: "Shareholder Communications.pdf", type: "PDF", size: "2.8 MB", uploadDate: "2023-05-18", tags: { location: ['global'], phase: ['phase-1-plan'], content: ['governance'], version: ['latest'] } }
      ]
    },
    {
      id: "property-docs",
      name: "2. Property Documentation", 
      phase: 'phase-1-plan',
      documents: [
        { id: "deed-title", name: "Deeds & Title Documents.pdf", type: "PDF", size: "6.3 MB", uploadDate: "2023-02-10", tags: { location: ['us-dc-ashburn'], phase: ['phase-1-plan'], content: ['legal'], version: ['latest'] } },
        { id: "site-assessment", name: "Site Assessment Reports.pdf", type: "PDF", size: "9.1 MB", uploadDate: "2023-03-15", tags: { location: ['eu-dc-hamburg'], phase: ['phase-1-plan'], content: ['environmental'], version: ['latest'] } },
        { id: "land-registry", name: "Land Registry Records.pdf", type: "PDF", size: "2.4 MB", uploadDate: "2023-01-20", tags: { location: ['au-dc-sydney'], phase: ['phase-1-plan'], content: ['legal'], version: ['latest'] } },
        { id: "property-tax", name: "Property Tax Assessments.pdf", type: "PDF", size: "1.8 MB", uploadDate: "2023-03-05", tags: { location: ['sg-dc-singapore'], phase: ['phase-1-plan'], content: ['legal'], version: ['latest'] } },
        { id: "site-master", name: "Site Master Plans.dwg", type: "DWG", size: "12.2 MB", uploadDate: "2023-04-12", tags: { location: ['jp-dc-tokyo'], phase: ['phase-2-design'], content: ['facility_design'], version: ['latest'] } }
      ]
    },
    {
      id: "legal-compliance",
      name: "3. Legal & Compliance Documentation",
      phase: 'phase-1-plan',
      documents: [
        { id: "legal-entity", name: "Legal Entity Documents.pdf", type: "PDF", size: "3.5 MB", uploadDate: "2023-01-15", tags: { location: ['global'], phase: ['phase-1-plan'], content: ['legal'], version: ['latest'] } },
        { id: "permits-licenses", name: "Permits & Licenses.pdf", type: "PDF", size: "4.7 MB", uploadDate: "2023-02-28", tags: { location: ['eu-dc-london'], phase: ['phase-3-build'], content: ['legal'], version: ['latest'] } },
        { id: "compliance-certs", name: "Compliance Certificates (ISO).pdf", type: "PDF", size: "5.2 MB", uploadDate: "2023-03-10", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['governance'], version: ['latest'] } },
        { id: "regulatory-filings", name: "Regulatory Filings.pdf", type: "PDF", size: "7.3 MB", uploadDate: "2023-04-22", tags: { location: ['global'], phase: ['phase-5-optimize'], content: ['legal'], version: ['latest'] } },
        { id: "audit-reports", name: "Compliance Audit Reports.pdf", type: "PDF", size: "4.9 MB", uploadDate: "2023-05-14", tags: { location: ['global'], phase: ['phase-5-optimize'], content: ['audit'], version: ['latest'] } },
        { id: "insurance-certs", name: "Insurance Certificates & Policies.pdf", type: "PDF", size: "3.1 MB", uploadDate: "2023-02-05", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['legal'], version: ['latest'] } }
      ]
    },
    {
      id: "contract-docs",
      name: "4. Contract Documentation",
      phase: 'phase-1-plan',
      documents: [
        { id: "vendor-contracts", name: "Vendor Contracts.pdf", type: "PDF", size: "8.6 MB", uploadDate: "2023-03-18", tags: { location: ['global'], phase: ['phase-1-plan'], content: ['legal'], version: ['latest'] } },
        { id: "service-agreements", name: "Service Agreements.pdf", type: "PDF", size: "5.7 MB", uploadDate: "2023-04-05", tags: { location: ['americas'], phase: ['phase-4-operate'], content: ['legal'], version: ['latest'] } },
        { id: "ppa", name: "Power Purchase Agreements.pdf", type: "PDF", size: "6.2 MB", uploadDate: "2023-05-22", tags: { location: ['us-dc-dallas'], phase: ['phase-4-operate'], content: ['energy'], version: ['latest'] } },
        { id: "lease-agreements", name: "Lease Agreements.pdf", type: "PDF", size: "4.3 MB", uploadDate: "2023-02-15", tags: { location: ['eu-dc-paris'], phase: ['phase-1-plan'], content: ['legal'], version: ['latest'] } },
        { id: "maintenance-contracts", name: "Maintenance Contracts.pdf", type: "PDF", size: "3.8 MB", uploadDate: "2023-03-30", tags: { location: ['apac'], phase: ['phase-4-operate'], content: ['operational'], version: ['latest'] } },
        { id: "interconnection", name: "Interconnection Agreements.pdf", type: "PDF", size: "5.1 MB", uploadDate: "2023-04-18", tags: { location: ['eu-dc-amsterdam'], phase: ['phase-3-build'], content: ['technical'], version: ['latest'] } }
      ]
    },
    {
      id: "facility-docs",
      name: "5. Facility Documentation",
      phase: 'phase-2-design',
      documents: [
        { id: "building-plans", name: "Building Plans & Drawings.dwg", type: "DWG", size: "15.3 MB", uploadDate: "2023-03-12", tags: { location: ['us-dc-chicago'], phase: ['phase-2-design'], content: ['facility_design'], version: ['latest'] } },
        { id: "floor-plans-1", name: "Floor Plans.pdf", type: "PDF", size: "8.7 MB", uploadDate: "2023-04-20", tags: { location: ['eu-dc-hamburg'], phase: ['phase-2-design'], content: ['facility_design'], version: ['latest'] } },
        { id: "rack-elevation", name: "Rack Elevation Diagrams.pdf", type: "PDF", size: "6.4 MB", uploadDate: "2023-05-15", tags: { location: ['sg-dc-singapore'], phase: ['phase-2-design'], content: ['technical'], version: ['latest'] } },
        { id: "equipment-layout", name: "Equipment Layout Documents.pdf", type: "PDF", size: "7.2 MB", uploadDate: "2023-03-28", tags: { location: ['jp-dc-tokyo'], phase: ['phase-3-build'], content: ['technical'], version: ['latest'] } },
        { id: "cable-pathway", name: "Cable Pathway Documents.pdf", type: "PDF", size: "5.8 MB", uploadDate: "2023-04-10", tags: { location: ['au-dc-sydney'], phase: ['phase-3-build'], content: ['technical'], version: ['latest'] } },
        { id: "bms-docs", name: "Building Management System Documentation.pdf", type: "PDF", size: "9.3 MB", uploadDate: "2023-05-05", tags: { location: ['us-dc-ashburn'], phase: ['phase-4-operate'], content: ['technical'], version: ['latest'] } }
      ]
    },
    {
      id: "energy-docs",
      name: "6. Energy Documentation",
      phase: 'phase-5-optimize',
      documents: [
        { id: "epc", name: "Energy Performance Certificates.pdf", type: "PDF", size: "3.4 MB", uploadDate: "2023-02-25", tags: { location: ['eu-dc-london'], phase: ['phase-5-optimize'], content: ['energy'], version: ['latest'] } },
        { id: "energy-audit", name: "Energy Audit Reports.pdf", type: "PDF", size: "7.6 MB", uploadDate: "2023-04-08", tags: { location: ['eu-dc-paris'], phase: ['phase-5-optimize'], content: ['energy'], version: ['latest'] } },
        { id: "energy-efficiency", name: "Energy Efficiency Documentation.pdf", type: "PDF", size: "5.3 MB", uploadDate: "2023-05-12", tags: { location: ['us-dc-dallas'], phase: ['phase-5-optimize'], content: ['energy'], version: ['latest'] } },
        { id: "energy-bills", name: "Energy Bills & Invoices.pdf", type: "PDF", size: "4.2 MB", uploadDate: "2023-03-15", tags: { location: ['sg-dc-singapore'], phase: ['phase-4-operate'], content: ['energy'], version: ['latest'] } },
        { id: "power-capacity", name: "Power Capacity Planning Documents.pdf", type: "PDF", size: "6.7 MB", uploadDate: "2023-04-22", tags: { location: ['jp-dc-tokyo'], phase: ['phase-2-design'], content: ['energy'], version: ['latest'] } },
        { id: "carbon-footprint", name: "Carbon Footprint Reports.pdf", type: "PDF", size: "5.5 MB", uploadDate: "2023-05-18", tags: { location: ['global'], phase: ['phase-5-optimize'], content: ['environmental'], version: ['latest'] } },
        { id: "pue-certification", name: "PUE Certification Documents.pdf", type: "PDF", size: "4.8 MB", uploadDate: "2023-04-05", tags: { location: ['au-dc-sydney'], phase: ['phase-5-optimize'], content: ['energy'], version: ['latest'] } }
      ]
    },
    {
      id: "technical-docs",
      name: "7. Technical Documentation",
      phase: 'phase-2-design',
      documents: [
        { id: "network-architecture", name: "Network Architecture Documents.pdf", type: "PDF", size: "7.8 MB", uploadDate: "2023-03-22", tags: { location: ['global'], phase: ['phase-2-design'], content: ['technical'], version: ['latest'] } },
        { id: "power-distribution", name: "Power Distribution Diagrams.pdf", type: "PDF", size: "6.5 MB", uploadDate: "2023-04-18", tags: { location: ['us-dc-chicago'], phase: ['phase-2-design'], content: ['technical'], version: ['latest'] } },
        { id: "cooling-system", name: "Cooling System Schematics.pdf", type: "PDF", size: "5.9 MB", uploadDate: "2023-05-10", tags: { location: ['eu-dc-amsterdam'], phase: ['phase-2-design'], content: ['technical'], version: ['latest'] } },
        { id: "equipment-specs", name: "Equipment Specifications.pdf", type: "PDF", size: "8.3 MB", uploadDate: "2023-04-05", tags: { location: ['sg-dc-singapore'], phase: ['phase-3-build'], content: ['technical'], version: ['latest'] } },
        { id: "technical-standards", name: "Technical Standards.pdf", type: "PDF", size: "4.6 MB", uploadDate: "2023-03-15", tags: { location: ['global'], phase: ['phase-2-design'], content: ['technical'], version: ['latest'] } },
        { id: "infrastructure-deps", name: "Infrastructure Dependency Maps.pdf", type: "PDF", size: "6.1 MB", uploadDate: "2023-05-20", tags: { location: ['jp-dc-tokyo'], phase: ['phase-4-operate'], content: ['technical'], version: ['latest'] } }
      ]
    },
    {
      id: "operations-docs",
      name: "8. Operations Documentation",
      phase: 'phase-4-operate',
      documents: [
        { id: "sops-1", name: "Standard Operating Procedures (SOPs).pdf", type: "PDF", size: "7.2 MB", uploadDate: "2023-03-18", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['operational'], version: ['latest'] } },
        { id: "run-books", name: "Run Books.pdf", type: "PDF", size: "5.4 MB", uploadDate: "2023-04-12", tags: { location: ['americas'], phase: ['phase-4-operate'], content: ['operational'], version: ['latest'] } },
        { id: "operational-manuals", name: "Operational Manuals.pdf", type: "PDF", size: "8.7 MB", uploadDate: "2023-05-05", tags: { location: ['emea'], phase: ['phase-4-operate'], content: ['operational'], version: ['latest'] } },
        { id: "maintenance-schedules", name: "Maintenance Schedules & Inspection Reports.pdf", type: "PDF", size: "6.3 MB", uploadDate: "2023-04-22", tags: { location: ['apac'], phase: ['phase-4-operate'], content: ['operational'], version: ['latest'] } },
        { id: "change-management", name: "Change Management Documentation.pdf", type: "PDF", size: "4.8 MB", uploadDate: "2023-03-28", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['governance'], version: ['latest'] } },
        { id: "operational-review", name: "Operational Review Reports.pdf", type: "PDF", size: "5.6 MB", uploadDate: "2023-05-15", tags: { location: ['us-dc-ashburn'], phase: ['phase-5-optimize'], content: ['audit'], version: ['latest'] } }
      ]
    },
    {
      id: "security-docs",
      name: "9. Security Documentation", 
      phase: 'phase-4-operate',
      documents: [
        { id: "security-policy", name: "Security Policy Documents.pdf", type: "PDF", size: "5.8 MB", uploadDate: "2023-03-10", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['security'], version: ['latest'] } },
        { id: "access-control", name: "Access Control Procedures.pdf", type: "PDF", size: "4.3 MB", uploadDate: "2023-04-05", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['security'], version: ['latest'] } },
        { id: "security-audit", name: "Security Audit Reports.pdf", type: "PDF", size: "6.7 MB", uploadDate: "2023-05-12", tags: { location: ['global'], phase: ['phase-5-optimize'], content: ['security'], version: ['latest'] } },
        { id: "security-certifications", name: "Security Certifications.pdf", type: "PDF", size: "3.9 MB", uploadDate: "2023-04-18", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['security'], version: ['latest'] } },
        { id: "security-incidents", name: "Security Incident Reports.pdf", type: "PDF", size: "5.2 MB", uploadDate: "2023-03-25", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['security'], version: ['latest'] } },
        { id: "physical-security", name: "Physical Security Plans.pdf", type: "PDF", size: "4.5 MB", uploadDate: "2023-04-30", tags: { location: ['us-dc-dallas'], phase: ['phase-2-design'], content: ['security'], version: ['latest'] } }
      ]
    },
    {
      id: "risk-management",
      name: "10. Risk Management Documentation",
      phase: 'phase-4-operate',
      documents: [
        { id: "disaster-recovery", name: "Disaster Recovery Plans.pdf", type: "PDF", size: "6.3 MB", uploadDate: "2023-03-15", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['risk'], version: ['latest'] } },
        { id: "business-continuity", name: "Business Continuity Documentation.pdf", type: "PDF", size: "7.1 MB", uploadDate: "2023-04-20", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['risk'], version: ['latest'] } },
        { id: "risk-assessment", name: "Risk Assessment Reports.pdf", type: "PDF", size: "5.6 MB", uploadDate: "2023-05-10", tags: { location: ['eu-dc-hamburg'], phase: ['phase-5-optimize'], content: ['risk'], version: ['latest'] } },
        { id: "risk-register", name: "Risk Register.pdf", type: "PDF", size: "4.2 MB", uploadDate: "2023-04-05", tags: { location: ['sg-dc-singapore'], phase: ['phase-4-operate'], content: ['risk'], version: ['latest'] } },
        { id: "incident-response", name: "Incident Response Procedures.pdf", type: "PDF", size: "5.8 MB", uploadDate: "2023-03-22", tags: { location: ['jp-dc-tokyo'], phase: ['phase-4-operate'], content: ['risk'], version: ['latest'] } },
        { id: "emergency-response", name: "Emergency Response Plans.pdf", type: "PDF", size: "4.9 MB", uploadDate: "2023-05-18", tags: { location: ['au-dc-sydney'], phase: ['phase-4-operate'], content: ['risk'], version: ['latest'] } },
        { id: "business-impact", name: "Business Impact Analysis Documents.pdf", type: "PDF", size: "6.5 MB", uploadDate: "2023-04-15", tags: { location: ['eu-dc-london'], phase: ['phase-5-optimize'], content: ['risk'], version: ['latest'] } }
      ]
    },
    {
      id: "customer-docs",
      name: "11. Customer Documentation",
      phase: 'phase-4-operate',
      documents: [
        { id: "slas", name: "Service Level Agreements (SLAs).pdf", type: "PDF", size: "4.7 MB", uploadDate: "2023-03-10", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['legal'], version: ['latest'] } },
        { id: "customer-contracts", name: "Customer Contracts.pdf", type: "PDF", size: "6.3 MB", uploadDate: "2023-04-15", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['legal'], version: ['latest'] } },
        { id: "colocation-agreements", name: "Colocation Agreements.pdf", type: "PDF", size: "5.8 MB", uploadDate: "2023-05-20", tags: { location: ['americas'], phase: ['phase-4-operate'], content: ['legal'], version: ['latest'] } }
      ]
    },
    {
      id: "training-docs",
      name: "12. Training & Certification Documentation",
      phase: 'phase-4-operate',
      documents: [
        { id: "staff-training", name: "Staff Training Records.pdf", type: "PDF", size: "5.3 MB", uploadDate: "2023-03-18", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['training'], version: ['latest'] } },
        { id: "compliance-training", name: "Compliance Training Materials.pdf", type: "PDF", size: "6.1 MB", uploadDate: "2023-04-22", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['training'], version: ['latest'] } },
        { id: "specialized-training", name: "Specialized Training Logs.pdf", type: "PDF", size: "4.5 MB", uploadDate: "2023-05-15", tags: { location: ['emea'], phase: ['phase-4-operate'], content: ['training'], version: ['latest'] } }
      ]
    },
    {
      id: "health-safety",
      name: "13. Health & Safety / Fire Safety Documentation",
      phase: 'phase-4-operate',
      documents: [
        { id: "health-safety-policy", name: "Health & Safety Policy.pdf", type: "PDF", size: "4.2 MB", uploadDate: "2023-03-05", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['governance'], version: ['latest'] } },
        { id: "fire-safety", name: "Fire Safety Risk Assessments.pdf", type: "PDF", size: "5.8 MB", uploadDate: "2023-04-12", tags: { location: ['eu-dc-paris'], phase: ['phase-5-optimize'], content: ['risk'], version: ['latest'] } },
        { id: "evacuation-plans", name: "Evacuation Plans.pdf", type: "PDF", size: "3.7 MB", uploadDate: "2023-05-08", tags: { location: ['us-dc-chicago'], phase: ['phase-4-operate'], content: ['risk'], version: ['latest'] } },
        { id: "fire-drill", name: "Fire Drill Records.pdf", type: "PDF", size: "2.9 MB", uploadDate: "2023-06-02", tags: { location: ['sg-dc-singapore'], phase: ['phase-4-operate'], content: ['operational'], version: ['latest'] } },
        { id: "incident-reporting", name: "Incident Reporting & Investigation Logs.pdf", type: "PDF", size: "4.6 MB", uploadDate: "2023-04-25", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['risk'], version: ['latest'] } }
      ]
    },
    {
      id: "environmental",
      name: "14. Environmental & Sustainability Documentation",
      phase: 'phase-5-optimize',
      documents: [
        { id: "environmental-policy", name: "Environmental Policy.pdf", type: "PDF", size: "3.8 MB", uploadDate: "2023-03-15", tags: { location: ['global'], phase: ['phase-5-optimize'], content: ['environmental'], version: ['latest'] } },
        { id: "environmental-impact", name: "Environmental Impact Assessments.pdf", type: "PDF", size: "7.2 MB", uploadDate: "2023-04-20", tags: { location: ['jp-dc-tokyo'], phase: ['phase-1-plan'], content: ['environmental'], version: ['latest'] } },
        { id: "sustainability-certs", name: "BREEAM/LEED Certificates.pdf", type: "PDF", size: "4.5 MB", uploadDate: "2023-05-25", tags: { location: ['au-dc-sydney'], phase: ['phase-5-optimize'], content: ['environmental'], version: ['latest'] } },
        { id: "waste-disposal", name: "Waste Disposal & Recycling Records.pdf", type: "PDF", size: "5.1 MB", uploadDate: "2023-04-10", tags: { location: ['eu-dc-amsterdam'], phase: ['phase-4-operate'], content: ['environmental'], version: ['latest'] } }
      ]
    },
    {
      id: "others",
      name: "15. Other Documents",
      phase: 'phase-4-operate',
      documents: [
        { id: "misc-doc-1", name: "Miscellaneous Technical Documentation.pdf", type: "PDF", size: "2.1 MB", uploadDate: "2023-06-01", tags: { location: ['global'], phase: ['phase-4-operate'], content: ['other'], version: ['latest'] } },
        { id: "misc-doc-2", name: "Other Business Documents.docx", type: "DOCX", size: "1.5 MB", uploadDate: "2023-06-05", tags: { location: ['us-dc-ashburn'], phase: ['phase-4-operate'], content: ['other'], version: ['latest'] } }
      ]
    }
  ], []);

  // Mock data for compliance questions - RESTORED
  const complianceQuestions = useMemo(() => [
    {
      id: "Q9",
      question: "Is the share of revenue known that is generated from products or services that are classified as 'environmentally sustainable' according to Articles 3 and 9 of Regulation (EU) 2020/852?",
      framework: "taxonomy",
      answer: "While the document doesn't provide specific revenue percentages, it establishes a framework for tracking and reporting on EU Taxonomy alignment.",
      documents: ["annual-report"]
    },
    {
      id: "Q91",
      question: "Is the disclosed information on risks and risk management in accordance with EU regulations?",
      framework: "taxonomy",
      answer: "Yes, the document explicitly aligns with EU regulations.",
      documents: ["sustainability-report", "annual-report"]
    },
    {
      id: "Q12",
      question: "Does the data center report on energy efficiency measures implemented?",
      framework: "eed",
      answer: "Yes, detailed energy efficiency measures and metrics are reported.",
      documents: ["energy-audit", "sustainability-report"]
    },
    {
      id: "Q24",
      question: "Is the organization monitoring its environmental performance?",
      framework: "eed",
      answer: "Yes, comprehensive environmental performance monitoring is established.",
      documents: ["environmental-policy", "carbon-footprint"]
    }
  ], []);

  // Enhanced document details data - RESTORED
  const documentDetailsData = useMemo(() => ({
    "iso-certification": {
      frameworks: [
        {
          id: "iso14001",
          name: "ISO 14001 (EMS)",
          compliance: 85,
          questions: [
            {
              id: "Q45",
              question: "Does the organization have a documented environmental management system?",
              answer: "Yes, the organization maintains a comprehensive environmental management system that meets ISO 14001:2015 requirements.",
              citations: [
                {
                  page: "4",
                  text: "Equinix has implemented and maintains an Environmental Management System (EMS) in accordance with the requirements of ISO 14001:2015, which is third-party certified across all regions."
                },
                {
                  page: "7",
                  text: "The EMS includes processes for identifying environmental aspects, legal requirements, setting objectives, and continual improvement focused on energy, water, waste, and emissions management."
                }
              ]
            }
          ]
        }
      ]
    },
    "annual-report": {
      frameworks: [
        {
          id: "taxonomy",
          name: "EU Taxonomy",
          compliance: 78,
          questions: [
            {
              id: "Q1",
              question: "Is the share of revenue known that is generated from products or services that are classified as 'environmentally sustainable'?",
              answer: "While the document doesn't provide specific revenue percentages, it establishes a framework for tracking and reporting on EU Taxonomy alignment.",
              citations: [
                {
                  page: "F-13",
                  text: "In 2023, we issued six tranches of green bonds approximating $4.9 billion. Our Green Finance Framework aligns our sustainability commitments with our long-term financing needs and highlights our pipeline of green projects and data center innovations."
                }
              ]
            }
          ]
        }
      ]
    }
  }), []);

  // ==================== PRODUCTION INTEGRATION - HELPER FUNCTIONS ====================

  // Helper function to flatten site hierarchy
  const flattenSiteHierarchy = useCallback((hierarchy) => {
    const flattened = [];
    const flatten = (nodes) => {
      nodes.forEach(node => {
        flattened.push(node);
        if (node.children) {
          flatten(node.children);
        }
      });
    };
    flatten(hierarchy);
    return flattened;
  }, []);

  // Get human-readable tag names
  const getTagDisplayName = useCallback((tag, type) => {
    const displayNames = {
      // Location tags
      'global': 'Global',
      'americas': 'Americas',
      'emea': 'EMEA', 
      'apac': 'APAC',
      'eu-dc-hamburg': 'Hamburg',
      'eu-dc-paris': 'Paris',
      'eu-dc-london': 'London',
      'eu-dc-amsterdam': 'Amsterdam',
      'us-dc-ashburn': 'Ashburn',
      'us-dc-chicago': 'Chicago',
      'us-dc-dallas': 'Dallas',
      'sg-dc-singapore': 'Singapore',
      'jp-dc-tokyo': 'Tokyo',
      'au-dc-sydney': 'Sydney',
      
      // Phase tags
      'phase-1-plan': 'Plan',
      'phase-2-design': 'Design',
      'phase-3-build': 'Build',
      'phase-4-operate': 'Operate',
      'phase-5-optimize': 'Optimize',
      'phase-6-decommission': 'Decommission',
      
      // Content tags
      'annual_report': 'Annual Report',
      'environmental': 'Environmental',
      'security': 'Security',
      'quality': 'Quality',
      'energy': 'Energy',
      'taxonomy': 'Taxonomy',
      'facility_design': 'Facility',
      'legal': 'Legal',
      'governance': 'Governance',
      'operational': 'Operations',
      'audit': 'Audit',
      'risk': 'Risk',
      'training': 'Training',
      'sustainability': 'Sustainability',
      'technical': 'Technical',
      'financial': 'Financial',
      
      // Version tags
      'latest': 'Latest',
      'draft': 'Draft',
      'final': 'Final',
      'approved': 'Approved',
      'under_review': 'Review'
    };
    
    return displayNames[tag] || tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  // Get tag color based on type
  const getTagColor = useCallback((type, value) => {
    const colors = {
      location: '#2196f3',
      phase: lifecyclePhases.find(p => p.id === value)?.color || '#6b7280',
      content: '#4caf50',
      version: '#ff9800',
      status: '#9c27b0',
      custom: '#607d8b'
    };
    return colors[type] || colors.custom;
  }, [lifecyclePhases]);

  // Check if document is in site hierarchy
  const isDocumentInSiteHierarchy = useCallback((doc, targetSite) => {
    if (!doc.tags?.location) return targetSite === 'all' || targetSite === 'global';
    
    if (targetSite === 'all') return true;
    
    // Check direct match
    if (doc.tags.location.includes(targetSite)) return true;
    
    // Check hierarchical match for regions
    const site = flattenSiteHierarchy(siteHierarchy).find(s => s.id === targetSite);
    if (site?.level === 'region') {
      // If targeting a region, include documents from child sites
      const childSites = site.children?.map(child => child.id) || [];
      return doc.tags.location.some(loc => childSites.includes(loc));
    }
    
    // Include global documents for any specific site
    if (targetSite !== 'global' && doc.tags.location.includes('global')) {
      return true;
    }
    
    return false;
  }, [siteHierarchy, flattenSiteHierarchy]);

  // PRODUCTION: Site-specific compliance calculation
  const calculateSiteSpecificCompliance = useCallback((siteId, frameworkId) => {
    try {
      // Get all documents from all categories for this site
      const allDocuments = [
        ...documentCategories.flatMap(cat => cat.documents),
        ...vaultCategories.flatMap(cat => cat.documents),
        ...uploadedFiles.filter(file => file.status === 'processed') // PRODUCTION: Include real uploaded files
      ];
      
      // Filter documents that match the site hierarchy
      const siteDocuments = allDocuments.filter(doc => 
        isDocumentInSiteHierarchy(doc, siteId)
      );
      
      // Get framework definition  
      const framework = frameworks.find(fw => fw.id === frameworkId);
      if (!framework) return framework?.baseProgress || 0;
      
      // Filter documents relevant to this framework
      const relevantDocs = siteDocuments.filter(doc => {
        // Check if document has frameworks property (from documentCategories)
        if (doc.frameworks && doc.frameworks.includes(frameworkId)) {
          return true;
        }
        
        // Check content tags for framework relevance
        if (!doc.tags?.content) return false;
        
        const frameworkRelevantTags = getFrameworkRelevantTags(frameworkId);
        return doc.tags.content.some(tag => frameworkRelevantTags.includes(tag));
      });
      
      // Calculate completion score based on document availability
      const documentScore = Math.min((relevantDocs.length / framework.requiredDocs) * 100, 100);
      
      // Blend with base progress (70% document-based, 30% base)
      const finalScore = (documentScore * 0.7) + (framework.baseProgress * 0.3);
      
      return Math.round(finalScore);
    } catch (error) {
      console.error('Error calculating compliance score:', error);
      const framework = frameworks.find(fw => fw.id === frameworkId);
      return framework?.baseProgress || 0;
    }
  }, [documentCategories, vaultCategories, uploadedFiles, frameworks, isDocumentInSiteHierarchy]);

  // Get framework relevant tags
  const getFrameworkRelevantTags = useCallback((frameworkId) => {
    const tagMapping = {
      'taxonomy': ['environmental', 'sustainability', 'annual_report', 'esg', 'green'],
      'eed': ['energy', 'efficiency', 'audit', 'environmental'],
      'coc': ['energy', 'efficiency', 'operational', 'governance'],
      'iso14001': ['environmental', 'governance', 'audit', 'risk'],
      'iso27001': ['security', 'governance', 'risk', 'audit'],
      'iso9001': ['quality', 'governance', 'audit', 'operational']
    };
    return tagMapping[frameworkId] || [];
  }, []);

  // Calculate overall compliance for a site
  const calculateOverallCompliance = useCallback((siteId) => {
    const frameworkScores = frameworks.map(fw => 
      calculateSiteSpecificCompliance(siteId, fw.id)
    );
    return Math.round(frameworkScores.reduce((sum, score) => sum + score, 0) / frameworks.length);
  }, [frameworks, calculateSiteSpecificCompliance]);

  // Site compliance scores with ACTUAL logic
  const siteComplianceScores = useMemo(() => {
    const scores = {};
    const allSites = flattenSiteHierarchy(siteHierarchy);
    
    allSites.forEach(site => {
      scores[site.id] = {
        overall: calculateOverallCompliance(site.id),
        frameworks: frameworks.map(fw => ({
          id: fw.id,
          name: fw.name,
          score: calculateSiteSpecificCompliance(site.id, fw.id),
          documents: [
            ...documentCategories.flatMap(cat => cat.documents),
            ...vaultCategories.flatMap(cat => cat.documents),
            ...uploadedFiles.filter(file => file.status === 'processed') // PRODUCTION: Include uploaded files
          ].filter(doc => {
            const matchesLocation = isDocumentInSiteHierarchy(doc, site.id);
            const matchesFramework = doc.frameworks?.includes(fw.id) || 
              (doc.tags?.content?.some(tag => getFrameworkRelevantTags(fw.id).includes(tag)));
            return matchesLocation && matchesFramework;
          }).length
        }))
      };
    });
    
    return scores;
  }, [documentCategories, vaultCategories, uploadedFiles, siteHierarchy, flattenSiteHierarchy, frameworks, calculateOverallCompliance, calculateSiteSpecificCompliance, isDocumentInSiteHierarchy, getFrameworkRelevantTags]);

  // PRODUCTION INTEGRATION: Document categorization using FileUploadService
  const categorizeDocument = useCallback((file) => {
    try {
      // Use the FileUploadService's intelligent categorization
      return fileUploadService.determineCategory(file, {
        workflow: { title: selectedFramework !== 'all' ? frameworks.find(fw => fw.id === selectedFramework)?.name : undefined },
        site: selectedSite
      });
    } catch (error) {
      console.error('Error categorizing document:', error);
      // Fallback to basic categorization
      if (!file || !file.name) return 'others';
      
      const fileName = file.name.toLowerCase();
      if (/energy|power|efficiency/.test(fileName)) return 'energy-docs';
      if (/security|access/.test(fileName)) return 'security-docs';
      if (/legal|compliance/.test(fileName)) return 'legal-compliance';
      if (/environment|sustainability/.test(fileName)) return 'environmental';
      return 'others';
    }
  }, [selectedFramework, selectedSite, frameworks]);

  // PRODUCTION INTEGRATION: Handle file upload with FileUploadButton
  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    console.log('Processing file upload:', files);
    
    try {
      // Process each file through the FileUploadService
      const processedFiles = [];
      
      for (const file of files) {
        try {
          // Use FileUploadService to process the file
          const result = await fileUploadService.processFile(file, {
            workflow: { 
              title: selectedFramework !== 'all' ? frameworks.find(fw => fw.id === selectedFramework)?.name : undefined 
            },
            site: selectedSite,
            category: categorizeDocument(file)
          });
          
          // Create standardized file object for our system
          const processedFile = {
            id: result.id,
            name: file.name,
            type: file.type,
            size: file.size,
            status: 'processing', // Will be updated by FileUploadService
            category: result.category,
            uploadTime: new Date().toISOString(),
            tags: {
              location: selectedSite !== 'all' ? [selectedSite] : ['global'],
              phase: [],
              content: [result.category?.replace('-docs', '') || 'other'],
              version: ['latest']
            }
          };
          
          processedFiles.push(processedFile);
          
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          // Add error file to show user feedback
          processedFiles.push({
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            status: 'error',
            error: error.message,
            category: 'others',
            uploadTime: new Date().toISOString()
          });
        }
      }
      
      // Update uploaded files list
      setUploadedFiles(prevFiles => {
        const newFiles = processedFiles.filter(file => 
          !prevFiles.some(existing => existing.id === file.id)
        );
        return [...prevFiles, ...newFiles];
      });

      // Trigger category refresh
      setNeedsCategoryRefresh(true);
      
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
    }
  }, [selectedFramework, selectedSite, frameworks, categorizeDocument]);
  // PRODUCTION INTEGRATION: Enhanced document integration with FileUploadService
  const integrateUploadedFiles = useCallback(() => {
    try {
      const updatedVaultCategories = JSON.parse(JSON.stringify(vaultCategories));
      
      // Process uploaded files that are processed/completed
      const processedFiles = uploadedFiles.filter(file => 
        ['processed', 'uploaded', 'complete'].includes(file.status)
      );

      processedFiles.forEach(file => {
        // Skip if file is already in a category
        const existsInVault = updatedVaultCategories.some(
          cat => cat.documents.some(doc => doc.id === file.id)
        );
        if (existsInVault) return;

        // Use the file's category or determine it
        const categoryId = file.category || categorizeDocument(file);

        // Create document object for the vault
        const newDocument = {
          id: file.id,
          name: file.name,
          type: file.type?.includes('pdf') ? 'PDF' : 
                file.type?.includes('image') ? 'Image' :
                file.type?.includes('spreadsheet') || file.type?.includes('excel') ? 'Excel' :
                file.type?.includes('document') || file.type?.includes('word') ? 'Word' :
                file.type?.toUpperCase() || 'File',
          size: typeof file.size === 'number' ? formatFileSize(file.size) : file.size,
          uploadDate: new Date(file.uploadTime || Date.now()).toISOString().split('T')[0],
          status: file.status === 'processed' ? 'complete' : file.status,
          frameworks: [],
          questionCount: 0,
          tags: file.tags || {
            location: selectedSite !== 'all' ? [selectedSite] : ['global'],
            phase: [],
            content: [],
            version: ['latest'],
            custom: []
          },
          // PRODUCTION: Add FileUploadService metadata
          fileServiceId: file.id,
          gcpPath: file.gcpPath,
          uploadSource: 'FileUploadService'
        };
        
        // Find the category and add the document
        const category = updatedVaultCategories.find(cat => cat.id === categoryId);
        if (category) {
          category.documents.push(newDocument);
          console.log(`Added document ${file.name} to category ${category.name}`);
        } else {
          // If category not found, add to "Others"
          const othersCategory = updatedVaultCategories.find(cat => cat.id === 'others');
          if (othersCategory) {
            othersCategory.documents.push(newDocument);
            console.log(`Added document ${file.name} to Others category`);
          }
        }
      });
      
      return updatedVaultCategories;
    } catch (error) {
      console.error('Error integrating uploaded files:', error);
      return vaultCategories;
    }
  }, [uploadedFiles, vaultCategories, categorizeDocument, selectedSite]);

  // Format file size helper
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Update vault categories when new files are uploaded
  useEffect(() => {
    if (needsCategoryRefresh && uploadedFiles.length > 0) {
      console.log('Refreshing vault categories with uploaded files');
      const updatedCategories = integrateUploadedFiles();
      setVaultCategoriesWithUploads(updatedCategories);
      setNeedsCategoryRefresh(false);
    }
  }, [needsCategoryRefresh, uploadedFiles, integrateUploadedFiles]);

  // PRODUCTION INTEGRATION: Monitor FileUploadService for progress updates
  useEffect(() => {
    if (uploadedFiles.length === 0) return;

    const interval = setInterval(() => {
      const updatedFiles = uploadedFiles.map(file => {
        if (file.fileServiceId && ['processing', 'uploading', 'queued'].includes(file.status)) {
          try {
            // Get updated file info from FileUploadService
            const fileInfo = fileUploadService.getFileDisplayInfo(file.fileServiceId);
            if (fileInfo) {
              return {
                ...file,
                status: fileInfo.status,
                uploadProgress: fileInfo.uploadProgress,
                processingProgress: fileInfo.processingProgress,
                error: fileInfo.error
              };
            }
          } catch (error) {
            console.warn(`Error getting file info for ${file.id}:`, error);
          }
        }
        return file;
      });

      // Check if any files were updated
      const hasUpdates = updatedFiles.some((file, index) => 
        file.status !== uploadedFiles[index]?.status ||
        file.uploadProgress !== uploadedFiles[index]?.uploadProgress
      );

      if (hasUpdates) {
        setUploadedFiles(updatedFiles);
        
        // Check if any files completed processing
        const newlyProcessed = updatedFiles.filter((file, index) => 
          file.status === 'processed' && uploadedFiles[index]?.status !== 'processed'
        );
        
        if (newlyProcessed.length > 0) {
          setNeedsCategoryRefresh(true);
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [uploadedFiles]);

  // Enhanced filtering with multi-criteria support
  const filteredDocumentCategories = useMemo(() => {
    return documentCategories.map(category => ({
      ...category,
      documents: category.documents.filter(doc => {
        // Search filter
        const matchesSearch = searchQuery === '' || 
          doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Site filter
        const matchesSite = selectedSite === 'all' || 
          isDocumentInSiteHierarchy(doc, selectedSite);
        
        // Phase filter  
        const matchesPhase = selectedPhase === 'all' ||
          (doc.tags?.phase && doc.tags.phase.includes(selectedPhase)) ||
          category.phase === selectedPhase;
        
        // Framework filter
        const matchesFramework = selectedFramework === 'all' ||
          (doc.frameworks && doc.frameworks.includes(selectedFramework));
        
        return matchesSearch && matchesSite && matchesPhase && matchesFramework;
      })
    })).filter(category => category.documents.length > 0);
  }, [documentCategories, searchQuery, selectedSite, selectedPhase, selectedFramework, isDocumentInSiteHierarchy]);

  // Enhanced vault categories filtering with uploaded files integration
  const filteredVaultCategories = useMemo(() => {
    const baseCategories = vaultCategoriesWithUploads.length > 0 ? vaultCategoriesWithUploads : vaultCategories;
    
    return baseCategories.map(category => ({
      ...category,
      documents: category.documents.filter(doc => {
        // Search filter
        const matchesSearch = searchQuery === '' || 
          doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Site filter
        const matchesSite = selectedSite === 'all' || 
          isDocumentInSiteHierarchy(doc, selectedSite);
        
        // Phase filter  
        const matchesPhase = selectedPhase === 'all' ||
          (doc.tags?.phase && doc.tags.phase.includes(selectedPhase)) ||
          category.phase === selectedPhase;
        
        return matchesSearch && matchesSite && matchesPhase;
      })
    })).filter(category => category.documents.length > 0);
  }, [vaultCategoriesWithUploads, vaultCategories, searchQuery, selectedSite, selectedPhase, isDocumentInSiteHierarchy]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (selectedSite === 'all') {
      return Math.round(
        documentCategories.reduce((sum, cat) => sum + cat.progress, 0) / documentCategories.length
      );
    } else {
      return siteComplianceScores[selectedSite]?.overall || 0;
    }
  }, [documentCategories, selectedSite, siteComplianceScores]);

  // Get status badge properties
  const getStatusBadge = useCallback((status) => {
    switch(status) {
      case 'complete':
        return { color: 'bg-green-500', text: 'Complete' };
      case 'pending':
        return { color: 'bg-yellow-500', text: 'Pending' };
      case 'review':
        return { color: 'bg-blue-500', text: 'Under Review' };
      case 'processing':
        return { color: 'bg-orange-500', text: 'Processing' };
      case 'error':
        return { color: 'bg-red-500', text: 'Error' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown' };
    }
  }, []);

  // Get section color based on category ID for styling
  const getSectionColor = useCallback((categoryId, index) => {
    const colorScheme = [
      { bg: 'rgba(33, 150, 243, 0.07)', border: 'rgba(33, 150, 243, 0.3)', header: 'rgba(33, 150, 243, 0.15)' },
      { bg: 'rgba(156, 39, 176, 0.07)', border: 'rgba(156, 39, 176, 0.3)', header: 'rgba(156, 39, 176, 0.15)' },
      { bg: 'rgba(76, 175, 80, 0.07)', border: 'rgba(76, 175, 80, 0.3)', header: 'rgba(76, 175, 80, 0.15)' },
    ];
    return colorScheme[index % colorScheme.length];
  }, []);

  // Handle functions
  const handleViewDocumentDetails = useCallback((doc) => {
    setSelectedDocument(doc);
    setShowDocumentDetails(true);
  }, []);

  const handleShowComplianceMap = useCallback((doc) => {
    setMappingDocument(doc);
    setShowComplianceMap(true);
  }, []);

  const handleFrameworkClick = useCallback((framework) => {
    setSelectedFramework(framework);
  }, []);

  const handleFrameworkDetailsClick = useCallback((framework, event) => {
    event.stopPropagation();
    setSelectedFrameworkDetails(framework);
    setShowFrameworkDetails(true);
  }, []);

  // Get questions for a specific document
  const getDocumentQuestions = useCallback((docId) => {
    return complianceQuestions.filter(q => q.documents.includes(docId));
  }, [complianceQuestions]);

  // ==================== UI COMPONENTS ====================

  // Site Selector Component
  const SiteSelector = useCallback(() => {
    const flatSites = flattenSiteHierarchy(siteHierarchy);
    
    return (
      <div style={{ position: 'relative', minWidth: '250px' }}>
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            fontSize: '0.875rem',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Sites</option>
          <option value="global">Global Corporate</option>
          <optgroup label="Americas">
            <option value="americas">Americas Region</option>
            <option value="us-dc-ashburn">  US-DC-Ashburn</option>
            <option value="us-dc-chicago">  US-DC-Chicago</option>
            <option value="us-dc-dallas">  US-DC-Dallas</option>
          </optgroup>
          <optgroup label="EMEA">
            <option value="emea">EMEA Region</option>
            <option value="eu-dc-hamburg">  EU-DC-Hamburg</option>
            <option value="eu-dc-paris">  EU-DC-Paris</option>
            <option value="eu-dc-london">  EU-DC-London</option>
            <option value="eu-dc-amsterdam">  EU-DC-Amsterdam</option>
          </optgroup>
          <optgroup label="APAC">
            <option value="apac">APAC Region</option>
            <option value="sg-dc-singapore">  SG-DC-Singapore</option>
            <option value="jp-dc-tokyo">  JP-DC-Tokyo</option>
            <option value="au-dc-sydney">  AU-DC-Sydney</option>
          </optgroup>
        </select>
        
        {/* Compliance Score Indicator */}
        {selectedSite !== 'all' && siteComplianceScores[selectedSite] && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: siteComplianceScores[selectedSite].overall >= 80 ? '#4caf50' : 
                            siteComplianceScores[selectedSite].overall >= 60 ? '#ff9800' : '#f44336',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            border: '2px solid white'
          }}>
            {siteComplianceScores[selectedSite].overall}%
          </div>
        )}
      </div>
    );
  }, [selectedSite, siteHierarchy, flattenSiteHierarchy, siteComplianceScores]);

  // Tag Badge Component
  const TagBadge = useCallback(({ tag, type, onRemove, clickable = false, onClick, selected = false }) => {
    const color = getTagColor(type, tag);
    const displayName = getTagDisplayName(tag, type);

    return (
      <span
        onClick={clickable ? onClick : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 8px',
          margin: '2px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '500',
          cursor: clickable ? 'pointer' : 'default',
          backgroundColor: selected ? color : color + '20',
          color: selected ? 'white' : color,
          border: `1px solid ${color}`,
          transition: 'all 0.2s ease'
        }}
      >
        {displayName}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(tag);
            }}
            style={{
              marginLeft: '4px',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '0',
              fontSize: '0.875rem'
            }}
          >
            ×
          </button>
        )}
      </span>
    );
  }, [getTagColor, getTagDisplayName]);

  // Standard UI Components
  const Card = useCallback(({ children, className, style }) => (
    <div 
      className={`card ${className || ''}`} 
      style={{ 
        padding: '16px', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', 
        border: '1px solid #e0e0e0', 
        ...style 
      }}
    >
      {children}
    </div>
  ), []);

  const Badge = useCallback(({ children, className, onClick, style }) => (
    <span 
      onClick={onClick}
      style={{ 
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        color: 'white',
        backgroundColor: className && className.includes('green') ? '#4caf50' : 
                        className && className.includes('yellow') ? '#ff9800' : 
                        className && className.includes('blue') ? '#2196f3' : 
                        className && className.includes('red') ? '#f44336' : '#9e9e9e',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </span>
  ), []);

  const Button = useCallback(({ children, variant, onClick, className, style, disabled }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        border: variant === 'outline' ? '1px solid #e0e0e0' : 'none',
        backgroundColor: disabled ? '#e0e0e0' : variant === 'outline' ? 'white' : '#9c27b0',
        color: disabled ? '#999' : variant === 'outline' ? '#333' : 'white',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        opacity: disabled ? 0.7 : 1,
        ...style
      }}
      className={className}
    >
      {children}
    </button>
  ), []);

  const Progress = useCallback(({ value, className }) => (
    <div style={{ 
      height: '8px', 
      backgroundColor: '#e0e0e0', 
      borderRadius: '4px', 
      overflow: 'hidden' 
    }} className={className}>
      <div style={{ 
        height: '100%', 
        width: `${value}%`, 
        backgroundColor: '#9c27b0'
      }}></div>
    </div>
  ), []);

  // ==================== MODAL COMPONENTS ====================

  // Tag Manager Modal Component
  const TagManager = ({ isOpen, onClose, onSave, customTags, setCustomTags, Button, TagBadge, getTagColor }) => {
    const [newTagName, setNewTagName] = useState('');
    const [newTagType, setNewTagType] = useState('content');
    const [editingTags, setEditingTags] = useState([...customTags]);

    const handleAddTag = useCallback(() => {
      if (newTagName.trim()) {
        const newTag = {
          id: `custom_${Date.now()}`,
          name: newTagName.trim().toLowerCase().replace(/\s+/g, '_'),
          displayName: newTagName.trim(),
          type: newTagType,
          color: getTagColor ? getTagColor(newTagType) : undefined,
          createdAt: new Date().toISOString(),
          isCustom: true
        };
        setEditingTags([...editingTags, newTag]);
        setNewTagName('');
      }
    }, [newTagName, newTagType, editingTags, getTagColor]);

    const handleDeleteTag = useCallback((tagId) => {
      setEditingTags(editingTags.filter(tag => tag.id !== tagId));
    }, [editingTags]);

    const handleSave = useCallback(() => {
      setCustomTags(editingTags);
      onSave?.(editingTags);
      onClose();
    }, [editingTags, onSave, onClose, setCustomTags]);

    useEffect(() => {
      if (isOpen) {
        setEditingTags([...customTags]);
      }
    }, [isOpen, customTags]);

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
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Manage Custom Tags
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.875rem' }}>
              Create custom tags for business-specific categorization
            </p>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Add New Tag</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '0.875rem', 
                    fontWeight: '500' 
                  }}>
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Board Ready, Confidential"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '0.875rem', 
                    fontWeight: '500' 
                  }}>
                    Type
                  </label>
                  <select
                    value={newTagType}
                    onChange={(e) => setNewTagType(e.target.value)}
                    style={{
                      padding: '8px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="content">Content</option>
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                    <option value="audience">Audience</option>
                  </select>
                </div>
                <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
                  Add
                </Button>
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Custom Tags</h3>
              {editingTags.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#666',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏷️</div>
                  <p style={{ margin: 0 }}>No custom tags created yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {editingTags.map(tag => (
                    <TagBadge
                      key={tag.id}
                      tag={tag.displayName || tag.name}
                      type={tag.type}
                      onRemove={() => handleDeleteTag(tag.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    );
  };

  // Framework Details Modal Component
  const FrameworkDetailsModal = ({ isOpen, onClose, framework, documentCategories, vaultCategories, complianceQuestions, siteComplianceScores, selectedSite, getTagDisplayName, siteHierarchy, TagBadge, Button }) => {
    if (!isOpen || !framework) return null;
    
    const getFrameworkDisplayName = (fw) => {
      switch(fw) {
        case 'taxonomy': return 'EU Taxonomy';
        case 'coc': return 'EU Code of Conduct';
        case 'eed': return 'Energy Efficiency Directive';
        case 'iso14001': return 'ISO 14001 (EMS)';
        case 'iso27001': return 'ISO 27001 (ISMS)';
        case 'iso9001': return 'ISO 9001 (QMS)';
        default: return fw;
      }
    };
    
    const getFrameworkColor = (fw) => {
      switch(fw) {
        case 'taxonomy': return { bg: 'rgba(255, 193, 7, 0.05)', border: 'rgba(255, 193, 7, 0.2)', header: 'rgba(255, 193, 7, 0.1)', text: '#f57f17', badge: 'bg-yellow-500' };
        case 'coc': return { bg: 'rgba(33, 150, 243, 0.05)', border: 'rgba(33, 150, 243, 0.2)', header: 'rgba(33, 150, 243, 0.1)', text: '#1976d2', badge: 'bg-blue-500' };
        case 'eed': return { bg: 'rgba(76, 175, 80, 0.05)', border: 'rgba(76, 175, 80, 0.2)', header: 'rgba(76, 175, 80, 0.1)', text: '#388e3c', badge: 'bg-green-500' };
        default: return { bg: 'rgba(158, 158, 158, 0.05)', border: 'rgba(158, 158, 158, 0.2)', header: 'rgba(158, 158, 158, 0.1)', text: '#616161', badge: 'bg-gray-500' };
      }
    };

    const relevantDocuments = [
      ...documentCategories.flatMap(cat => cat.documents),
      ...vaultCategories.flatMap(cat => cat.documents)
    ].filter(doc => {
      return doc.frameworks && doc.frameworks.includes(framework);
    });
    
    const relevantQuestions = complianceQuestions.filter(q => q.framework === framework);
    
    const siteScore = selectedSite !== 'all' && siteComplianceScores[selectedSite] 
      ? siteComplianceScores[selectedSite].frameworks.find(fw => fw.id === framework)?.score || 0
      : 85;
    
    const siteDocCount = selectedSite !== 'all' && siteComplianceScores[selectedSite]
      ? siteComplianceScores[selectedSite].frameworks.find(fw => fw.id === framework)?.documents || 0
      : relevantDocuments.length;
    
    const colors = getFrameworkColor(framework);
    
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
          width: '95%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            backgroundColor: colors.header,
            borderBottom: `1px solid ${colors.border}`
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: colors.text }}>
              {getFrameworkDisplayName(framework)} Framework Details
            </h2>
            <button 
              onClick={onClose}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{
            padding: '20px 24px',
            backgroundColor: colors.bg,
            borderBottom: `1px solid ${colors.border}`
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '16px'
            }}>
              <div style={{ 
                backgroundColor: 'white', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Compliance Progress</div>
                <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{siteScore}%</div>
                <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${siteScore}%`, 
                      backgroundColor: siteScore >= 70 ? '#4caf50' : 
                                      siteScore >= 50 ? '#ff9800' : '#f44336'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ 
                backgroundColor: 'white', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Total Documents</div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{siteDocCount}</div>
              </div>
              
              <div style={{ 
                backgroundColor: 'white', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Questions</div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{relevantQuestions.length}</div>
              </div>
              
              <div style={{ 
                backgroundColor: 'white', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Last Assessed</div>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>Mar 2, 2024</div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '20px 24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: colors.text }}>
              Documents Using {getFrameworkDisplayName(framework)}
            </h3>
            
            <div style={{ marginBottom: '32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                <thead style={{ backgroundColor: colors.header }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Questions</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantDocuments.slice(0, 10).map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontWeight: '500' }}>{doc.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {doc.tags?.location?.slice(0, 1).map(loc => (
                            <TagBadge key={loc} tag={loc} type="location" />
                          )) || <Badge className="bg-gray-500">Global</Badge>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge className={doc.status === 'complete' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {doc.status === 'complete' ? 'Complete' : 'Review'}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{doc.questionCount || 0}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Button 
                          variant="outline"
                          style={{ 
                            color: colors.text,
                            borderColor: colors.border
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: colors.text }}>
              {getFrameworkDisplayName(framework)} Compliance Questions
            </h3>
            
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {relevantQuestions.map(question => (
                  <div 
                    key={question.id} 
                    style={{ 
                      backgroundColor: 'white',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ 
                      padding: '16px',
                      backgroundColor: colors.header,
                      borderBottom: `1px solid ${colors.border}`
                    }}>
                      <div style={{ fontWeight: '600', color: colors.text }}>{question.question}</div>
                    </div>
                    
                    <div style={{ padding: '16px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ fontWeight: '500' }}>Answer: </span> 
                        <span>{question.answer}</span>
                      </div>
                      
                      <div>
                        <span style={{ fontWeight: '500' }}>Referenced Documents: </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                          {question.documents.map(docId => {
                            const doc = [
                              ...documentCategories.flatMap(cat => cat.documents),
                              ...vaultCategories.flatMap(cat => cat.documents)
                            ].find(d => d.id === docId);
                                
                            return doc ? (
                              <Badge 
                                key={docId}
                                className="bg-gray-500"
                              >
                                {doc.name.length > 30 ? `${doc.name.substring(0, 30)}...` : doc.name}
                              </Badge>
                            ) : (
                              <Badge 
                                key={docId}
                                className="bg-gray-500"
                              >
                                {docId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              style={{
                backgroundColor: colors.text,
                color: 'white'
              }}
            >
              Export Framework Report
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Compliance Map Modal Component
  const ComplianceMapModal = ({ isOpen, onClose, document }) => {
    if (!isOpen || !document) return null;
    
    const complianceData = {
      frameworks: [
        { id: "taxonomy", name: "EU Taxonomy", relevance: "High" },
        { id: "eed", name: "Energy Efficiency Directive", relevance: "Medium" }
      ],
      questions: [
        { 
          id: "Q12", 
          question: "Does the data center report on energy efficiency measures implemented?", 
          relevance: "High",
          framework: "eed",
          citations: [
            { page: 15, text: "Annual reporting on key energy efficiency metrics..." },
            { page: 22, text: "Implementation of hot/cold aisle containment reduced PUE by 0.2..." }
          ]
        }
      ],
      citationsCount: 12,
      complianceScore: 78,
      lastValidated: "2024-02-15"
    };
    
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
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Compliance Mapping</h2>
            <button 
              onClick={onClose}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ 
                backgroundColor: 'rgba(33, 150, 243, 0.1)', 
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                📄
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 4px 0' }}>{document.name}</h3>
                <div style={{ color: '#666', fontSize: '0.875rem' }}>
                  {document.type} • {document.size} • Uploaded on {document.uploadDate}
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px',
                  marginTop: '16px'
                }}>
                  <div style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '6px' 
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '600' }}>Frameworks</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '4px' }}>{complianceData.frameworks.length}</div>
                  </div>
                  <div style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '6px' 
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '600' }}>Citations</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '4px' }}>{complianceData.citationsCount}</div>
                  </div>
                  <div style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '6px' 
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: '600' }}>Compliance Score</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '4px' }}>{complianceData.complianceScore}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '16px 24px'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}>Relevant Frameworks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {complianceData.frameworks.map(framework => (
                  <div 
                    key={framework.id} 
                    style={{ 
                      border: '1px solid #e0e0e0', 
                      padding: '12px', 
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>{framework.name}</div>
                    <Badge 
                      className={framework.relevance === 'High' ? 'bg-green-500' : 'bg-yellow-500'}
                    >
                      {framework.relevance} Relevance
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}>Compliance Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {complianceData.questions.map(question => (
                  <div 
                    key={question.id} 
                    style={{ 
                      border: '1px solid #e0e0e0', 
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ 
                      borderBottom: '1px solid #e0e0e0',
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: '500' }}>{question.question}</div>
                      <Badge className="bg-blue-500">
                        Energy Efficiency
                      </Badge>
                    </div>
                    
                    <div style={{ padding: '12px' }}>
                      <div style={{ color: '#666', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>Supporting Citations</div>
                      {question.citations.map((citation, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            borderLeft: '2px solid #2196f3', 
                            paddingLeft: '12px', 
                            marginBottom: '8px'
                          }}
                        >
                          <div style={{ fontSize: '0.875rem' }}>
                            <span style={{ fontWeight: '500' }}>Page {citation.page}:</span> "{citation.text}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button>
              Edit Mapping
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Document Details Modal Component
  const DocumentDetailsModal = ({ isOpen, onClose, document }) => {
    if (!isOpen || !document) return null;
    
    const documentDetails = documentDetailsData[document.id];
    if (!documentDetails) {
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
            padding: '32px',
            textAlign: 'center'
          }}>
            <h3>Document Details</h3>
            <p>Detailed information for this document is being processed.</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      );
    }
    
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
          width: '95%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Document Details</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
              ×
            </button>
          </div>
          
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ 
                backgroundColor: 'rgba(33, 150, 243, 0.1)', 
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                📄
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 4px 0' }}>{document.name}</h3>
                <div style={{ color: '#666', fontSize: '0.875rem' }}>
                  {document.type} • {document.size} • Uploaded on {document.uploadDate}
                </div>
                
                {/* Tags */}
                {document.tags && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {document.tags.location?.map(tag => (
                      <TagBadge key={tag} tag={tag} type="location" />
                    ))}
                    {document.tags.phase?.map(tag => (
                      <TagBadge key={tag} tag={tag} type="phase" />
                    ))}
                    {document.tags.content?.slice(0, 3).map(tag => (
                      <TagBadge key={tag} tag={tag} type="content" />
                    ))}
                    {document.tags.version?.includes('latest') && (
                      <TagBadge tag="latest" type="version" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '20px 24px'
          }}>
            {/* Framework compliance */}
            {documentDetails.frameworks?.map(framework => (
              <div key={framework.id} style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  {framework.name} - {framework.compliance}% Compliant
                </h3>
                
                {framework.questions.map((question, index) => (
                  <div key={index} style={{ marginBottom: '24px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>{question.question}</div>
                    <div style={{ marginBottom: '12px', color: '#666' }}>{question.answer}</div>
                    
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#666', marginBottom: '6px' }}>CITATIONS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {question.citations.map((citation, citIndex) => (
                          <div 
                            key={citIndex} 
                            style={{ 
                              backgroundColor: 'rgba(33, 150, 243, 0.05)',
                              border: '1px solid rgba(33, 150, 243, 0.2)',
                              borderRadius: '6px',
                              padding: '10px 12px',
                              fontSize: '0.875rem'
                            }}
                          >
                            <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1976d2' }}>Page {citation.page}</div>
                            <div style={{ fontStyle: 'italic' }}>"{citation.text}"</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button>Export Report</Button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== MAIN COMPONENT RETURN ====================
  
  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#fafafa'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Compliance Documentation Center
          </h1>
          <p style={{ color: '#666', marginTop: '4px', marginBottom: 0 }}>
            Multi-site document management and compliance tracking
          </p>
          {selectedSite !== 'all' && siteComplianceScores[selectedSite] && (
            <div style={{ 
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: siteComplianceScores[selectedSite].overall >= 80 ? '#e8f5e8' : 
                              siteComplianceScores[selectedSite].overall >= 60 ? '#fff3e0' : '#ffebee',
              color: siteComplianceScores[selectedSite].overall >= 80 ? '#2e7d32' : 
                     siteComplianceScores[selectedSite].overall >= 60 ? '#f57c00' : '#c62828',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Site Compliance Score: {siteComplianceScores[selectedSite].overall}%
            </div>
          )}
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Site Selector */}
          <SiteSelector />
          
          {/* Phase Filter */}
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              minWidth: '180px'
            }}
          >
            <option value="all">All Phases</option>
            {lifecyclePhases.map(phase => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>

          {/* Framework Filter */}
          <select
            style={{
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              minWidth: '200px'
            }}
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
          >
            <option value="all">All Frameworks & Standards</option>
            <optgroup label="Compliance Frameworks">
              <option value="taxonomy">EU Taxonomy</option>
              <option value="coc">EU Code of Conduct</option>
              <option value="eed">Energy Efficiency Directive</option>
            </optgroup>
            <optgroup label="ISO Standards">
              <option value="iso14001">ISO 14001 (EMS)</option>
              <option value="iso27001">ISO 27001 (ISMS)</option>
              <option value="iso9001">ISO 9001 (QMS)</option>
            </optgroup>
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '0.875rem',
              minWidth: '200px'
            }}
          />

          {/* Action Buttons */}
          <Button 
            onClick={() => setShowTagManager(true)} 
            variant="outline"
            style={{ whiteSpace: 'nowrap' }}
          >
            Manage Tags
          </Button>
          
          <FileUploadButton
            onFileSelect={handleFileUpload}
            multiple={true}
            acceptedTypes=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
            maxSize={50 * 1024 * 1024} // 50MB
          />
        </div>
      </div>

      {/* Framework Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Overall Compliance Card */}
        <Card style={{ 
          background: selectedSite !== 'all' ? 
            `linear-gradient(135deg, ${siteComplianceScores[selectedSite]?.overall >= 80 ? '#4caf50' : siteComplianceScores[selectedSite]?.overall >= 60 ? '#ff9800' : '#f44336'} 0%, ${siteComplianceScores[selectedSite]?.overall >= 80 ? '#388e3c' : siteComplianceScores[selectedSite]?.overall >= 60 ? '#f57c00' : '#d32f2f'} 100%)` :
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {selectedSite === 'all' ? 'Global Compliance' : 
               `${getTagDisplayName(selectedSite, 'location')} Compliance`}
            </div>
          </div>
          <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '12px' }}>
            {overallProgress}%
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Across {frameworks.length} frameworks • {
              selectedSite !== 'all' && siteComplianceScores[selectedSite] 
                ? siteComplianceScores[selectedSite].frameworks.reduce((sum, fw) => sum + fw.documents, 0)
                : documentCategories.reduce((sum, cat) => sum + cat.documents.length, 0) + uploadedFiles.filter(f => f.status === 'processed').length
            } documents
          </div>
        </Card>

        {/* Framework Cards with Site-Specific Scores */}
        {frameworks.slice(0, 5).map(framework => {
          const siteScore = selectedSite !== 'all' && siteComplianceScores[selectedSite] 
            ? siteComplianceScores[selectedSite].frameworks.find(fw => fw.id === framework.id)?.score || framework.baseProgress
            : framework.baseProgress;
          
          const siteDocCount = selectedSite !== 'all' && siteComplianceScores[selectedSite]
            ? siteComplianceScores[selectedSite].frameworks.find(fw => fw.id === framework.id)?.documents || 0
            : framework.documents;

          return (
            <Card 
              key={framework.id}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: selectedFramework === framework.id ? '2px solid #9c27b0' : '1px solid #e0e0e0',
                boxShadow: selectedFramework === framework.id ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                padding: '16px'
              }}
              onClick={() => handleFrameworkClick(framework.id)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{framework.name}</div>
                <div style={{
                  backgroundColor: siteScore >= 80 ? '#4caf50' : siteScore >= 60 ? '#ff9800' : '#f44336',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                onClick={(e) => handleFrameworkDetailsClick(framework.id, e)}
                >
                  Details →
                </div>
              </div>
              
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px' }}>
                {siteScore}%
              </div>
              
              <div style={{ 
                height: '8px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '4px', 
                overflow: 'hidden', 
                marginBottom: '8px' 
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${siteScore}%`, 
                  backgroundColor: '#9c27b0'
                }} />
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.875rem', 
                color: '#666' 
              }}>
                <span>{siteDocCount} Documents</span>
                <span>{framework.requiredDocs} Required</span>
              </div>

              {/* Site-specific indicator */}
              {selectedSite !== 'all' && (
                <div style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  color: '#666'
                }}>
                  {getTagDisplayName(selectedSite, 'location')}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <button 
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              color: activeTab === 'documents' ? '#9c27b0' : '#666',
              borderBottom: activeTab === 'documents' ? '2px solid #9c27b0' : '2px solid transparent',
            }}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button 
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              color: activeTab === 'questions' ? '#9c27b0' : '#666',
              borderBottom: activeTab === 'questions' ? '2px solid #9c27b0' : '2px solid transparent',
            }}
            onClick={() => setActiveTab('questions')}
          >
            Compliance Questions
          </button>
          <button 
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              color: activeTab === 'vault' ? '#9c27b0' : '#666',
              borderBottom: activeTab === 'vault' ? '2px solid #9c27b0' : '2px solid transparent',
            }}
            onClick={() => setActiveTab('vault')}
          >
            Document Vault
          </button>
        </div>
        
        {/* Documents Tab Content */}
        <div style={{ display: activeTab === 'documents' ? 'block' : 'none', marginTop: '16px' }}>
          {filteredDocumentCategories.map((category, index) => (
            <Card key={category.id} style={{ 
              marginBottom: '16px',
              backgroundColor: getSectionColor(category.id, index).bg,
              border: `1px solid ${getSectionColor(category.id, index).border}`,
              padding: 0
            }}>
              <div style={{ 
                padding: '16px', 
                backgroundColor: getSectionColor(category.id, index).header, 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ fontWeight: '600' }}>{category.name}</div>
                  {category.phase && (
                    <TagBadge tag={category.phase} type="phase" />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: '#666' }}>{category.progress}% Complete</span>
                  <div style={{ width: '100px' }}>
                    <Progress value={category.progress} />
                  </div>
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Upload Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Tags</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {category.documents.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {doc.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{doc.type}</td>
                      <td style={{ padding: '12px 16px' }}>{doc.uploadDate}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {doc.tags?.location?.slice(0, 1).map(tag => (
                            <TagBadge key={tag} tag={tag} type="location" />
                          ))}
                          {doc.tags?.content?.slice(0, 1).map(tag => (
                            <TagBadge key={tag} tag={tag} type="content" />
                          ))}
                          {doc.tags?.version?.includes('latest') && (
                            <TagBadge tag="latest" type="version" />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge className={getStatusBadge(doc.status).color}>
                          {getStatusBadge(doc.status).text}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {getDocumentQuestions(doc.id).length > 0 && (
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setSelectedDocument(doc);
                                handleShowComplianceMap(doc);
                              }}
                            >
                              <span style={{ marginRight: '4px' }}>{getDocumentQuestions(doc.id).length}</span>
                              <span>Citations</span>
                            </Button>
                          )}
                          <Button 
                            variant="outline"
                            onClick={() => handleViewDocumentDetails(doc)}
                          >
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
        
        {/* Compliance Questions Tab Content */}
        <div style={{ display: activeTab === 'questions' ? 'block' : 'none', marginTop: '16px' }}>
          <Card style={{ padding: 0 }}>
            <div style={{ padding: '16px' }}>
              <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Compliance Questions</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Question</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Framework</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Documents</th>
                </tr>
              </thead>
              <tbody>
                {complianceQuestions
                  .filter(q => selectedFramework === 'all' || q.framework === selectedFramework)
                  .map(question => (
                    <tr key={question.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '12px 16px' }}>{question.id}</td>
                      <td style={{ padding: '12px 16px' }}>{question.question}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge 
                          className={question.framework === 'taxonomy' ? 'bg-yellow-500' : 
                                   question.framework === 'coc' ? 'bg-blue-500' : 
                                   question.framework === 'eed' ? 'bg-green-500' : 'bg-gray-500'}
                        >
                          {question.framework === 'taxonomy' ? 'EU Taxonomy' : 
                           question.framework === 'coc' ? 'Code of Conduct' : 
                           question.framework === 'eed' ? 'Energy Efficiency Directive' : question.framework}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {question.documents.map(docId => {
                            const doc = documentCategories
                              .flatMap(cat => cat.documents)
                              .find(d => d.id === docId);
                            
                            return doc ? (
                              <Badge 
                                key={docId}
                                className="bg-gray-500"
                                onClick={() => handleViewDocumentDetails(doc)}
                              >
                                {doc.name.length > 20 ? `${doc.name.substring(0, 20)}...` : doc.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Document Vault Tab Content */}
        <div style={{ display: activeTab === 'vault' ? 'block' : 'none', marginTop: '16px' }}>
          <div style={{
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ marginRight: '16px' }}>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '8px', 
                  backgroundColor: 'rgba(33, 150, 243, 0.2)', 
                  borderRadius: '50%' 
                }}>
                  📁
                </span>
              </div>
              <div>
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  marginBottom: '4px',
                  color: '#1976d2'
                }}>
                  Document Vault
                </h3>
                <p style={{ 
                  fontSize: '0.875rem',
                  color: '#1976d2',
                  margin: 0
                }}>
                  Complete document management with smart filtering by site, phase, and compliance framework. 
                  All 15 document categories with intelligent categorization and processing status tracking.
                </p>
              </div>
            </div>
          </div>

          {filteredVaultCategories.map((category, index) => (
            <Card key={category.id} style={{ 
              marginBottom: '16px',
              backgroundColor: getSectionColor(category.id, index).bg,
              border: `1px solid ${getSectionColor(category.id, index).border}`,
              padding: 0
            }}>
              <div 
                style={{ 
                  padding: '16px', 
                  backgroundColor: getSectionColor(category.id, index).header, 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ fontWeight: '600' }}>{category.name}</div>
                  {category.phase && (
                    <TagBadge tag={category.phase} type="phase" />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    color: '#666',
                    backgroundColor: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px'
                  }}>
                    {category.documents.length} documents
                  </span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    style={{ 
                      transition: 'transform 0.2s',
                      transform: selectedCategory === category.id ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
              
              {selectedCategory === category.id && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Size</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Tags</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.documents.map(doc => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#666' }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <span style={{ fontWeight: '500' }}>{doc.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{doc.type}</td>
                        <td style={{ padding: '12px 16px' }}>{doc.size}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {doc.tags?.location?.slice(0, 1).map(tag => (
                              <TagBadge key={tag} tag={tag} type="location" />
                            ))}
                            {doc.tags?.content?.slice(0, 2).map(tag => (
                              <TagBadge key={tag} tag={tag} type="content" />
                            ))}
                            {doc.tags?.version?.includes('latest') && (
                              <TagBadge tag="latest" type="version" />
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button 
                              variant="outline"
                              onClick={() => handleViewDocumentDetails(doc)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="outline"
                            >
                              Download
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleShowComplianceMap(doc)}
                            >
                              Compliance Map
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Modals */}
      <ComplianceMapModal
        isOpen={showComplianceMap}
        onClose={() => setShowComplianceMap(false)}
        document={mappingDocument}
      />

      <DocumentDetailsModal
        isOpen={showDocumentDetails}
        onClose={() => setShowDocumentDetails(false)}
        document={selectedDocument}
      />

      <FrameworkDetailsModal
        isOpen={showFrameworkDetails}
        onClose={() => setShowFrameworkDetails(false)}
        framework={selectedFrameworkDetails}
        documentCategories={documentCategories}
        vaultCategories={vaultCategories}
        complianceQuestions={complianceQuestions}
        siteComplianceScores={siteComplianceScores}
        selectedSite={selectedSite}
        getTagDisplayName={getTagDisplayName}
        siteHierarchy={siteHierarchy}
        TagBadge={TagBadge}
        Button={Button}
      />

      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        onSave={(tags) => {
          setCustomTags(tags);
          console.log('Custom tags saved:', tags);
        }}
        customTags={customTags}
        setCustomTags={setCustomTags}
        Button={Button}
        TagBadge={TagBadge}
        getTagColor={getTagColor}
      />

      {/* CSS Styles */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          .card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          
          button:hover {
            transform: translateY(-1px);
          }
          
          select:focus, input:focus {
            outline: none;
            border-color: #9c27b0;
            box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.1);
          }
          
          /* Upload progress animations */
          .upload-progress {
            background: linear-gradient(90deg, #9c27b0 0%, #673ab7 100%);
            animation: progress-shine 2s infinite;
          }
          
          @keyframes progress-shine {
            0% { background-position: -200px 0; }
            100% { background-position: 200px 0; }
          }
          
          /* FileUploadButton tooltip */
          .file-upload-button:hover .tooltip {
            opacity: 1;
          }
        `}
      </style>
    </div>
  );
};

export default DataValidation;