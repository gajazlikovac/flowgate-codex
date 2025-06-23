import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useOthers, useMyPresence } from '../liveblocks';
import DocumentUploadModal from '../components/ui/DocumentUploadModal';
import fileUploadService from '../services/FileUploadService';
import { set } from 'date-fns';

// Real API endpoint for invitations
const INVITE_API = {
  endpoint: "https://invite-api-866853235757.europe-west3.run.app/invite"
};

// Tooltip component using React Portal
const InfoTooltip = ({ anchorRef, children, visible }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (anchorRef && anchorRef.current && visible) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY - 8, // 8px above
        left: rect.left + window.scrollX + rect.width / 2
      });
    }
  }, [anchorRef, visible]);
  if (!visible) return null;
  return ReactDOM.createPortal(
    <div style={{
      position: 'absolute',
      top: coords.top,
      left: coords.left,
      transform: 'translate(-50%, -100%)',
      background: '#fff',
      color: '#222',
      border: '1px solid #e5e7eb',
      borderRadius: '0.375rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.75rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      zIndex: 9999,
      maxWidth: '260px',
      wordWrap: 'break-word',
      pointerEvents: 'none',
      whiteSpace: 'normal',
    }}>
      {children}
    </div>,
    document.body
  );
};

const WorkflowsPage = () => {
  // DIRECT CONNECTION TO LIVEBLOCKS - No more props needed
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const { user } = useAuth0();
  
  // Extract online users directly from Liveblocks
  const onlineUsers = others
    .filter(other => other.presence?.user)
    .map(other => other.presence.user);
  
  // Map of workflows being viewed by other users - direct access
  const workflowsBeingViewed = others.reduce((acc, other) => {
    if (other.presence?.viewingWorkflowId) {
      if (!acc[other.presence.viewingWorkflowId]) {
        acc[other.presence.viewingWorkflowId] = [];
      }
      if (other.presence.user) {
        acc[other.presence.viewingWorkflowId].push(other.presence.user);
      }
    }
    return acc;
  }, {});
  
  // Function to handle workflow viewing presence updates
  const handleWorkflowView = (workflowId) => {
    console.log("[WorkflowsPage] Viewing workflow:", workflowId);
    updateMyPresence({ viewingWorkflowId: workflowId });
  };

  console.log("DIRECT ACCESS - Online users:", onlineUsers);
  console.log("DIRECT ACCESS - Current user:", user);
  
  // Original WorkflowsPage state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [reportGenerated, setReportGenerated] = useState({});
  
  // Document upload center state
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadComplete, setUploadComplete] = useState({});

  // Environmental Permit state
  const [environmentalActiveTab, setEnvironmentalActiveTab] = useState('active');
  const [showPermitDetails, setShowPermitDetails] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Main tab selection
  const [mainSection, setMainSection] = useState('plan'); // Change from 'compliance' to 'plan'
  // Tooltip state for main tabs
  const [hoveredTab, setHoveredTab] = useState(null);
  const planInfoRef = React.useRef();
  const designInfoRef = React.useRef();
  const buildInfoRef = React.useRef();
  const operateInfoRef = React.useRef();
  const optimizeInfoRef = React.useRef();
  const decommissionInfoRef = React.useRef();

  //progress bar state
  const [eedProgress, setEedProgress] = useState(45);
  const [taxonomyProgress, setTaxonomyProgress] = useState(62); 
  const [cocProgress, setCocProgress] = useState(78);
  const [iso14001Progress, setIso14001Progress] = useState(90);
  const [iso9001Progress, setIso9001Progress] = useState(95);
  const [iso27001Progress, setIso27001Progress] = useState(85);
  const [environmentalProgress, setEnvironmentalProgress] = useState(70); // Example progress for environmental permits
  // Global loading and toast state
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  // Helper function for showing toasts
  const displayToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Function to send invitations via API - will be passed to modals
  const sendInvitation = async (email) => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(INVITE_API.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Invitation sent successfully:", data);
      displayToast(`Invitation sent to ${email}`);
      return true;
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      displayToast(`Failed to send invitation: ${error.message}`, 'error');
      return false;
      
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch workflow progress data
  const fetchWorkflowProgress = async (workflowId) => {
    try {
      const response = await fetch(`https://fetching-api-866853235757.europe-west3.run.app/workflow-progress?workflow=${workflowId}`);
      if (!response.ok) {
        return 0.00;
        //throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.percent_answered;
    } catch (error) {
      console.error('Error fetching workflow progress:', error);
      displayToast(`Error fetching workflow data: ${error.message}`, 'error');
      return null;
    }
  };

  
  // Function to fetch progress for multiple workflows
  const fetchAllWorkflowProgress = useCallback(async () => {
    const workflowIds = [
      ...complianceFrameworks.map(w => w.id),
      ...isoStandards.map(w => w.id), 
      ...Object.keys(permits).flatMap(key => permits[key].map(p => p.id))
    ];

    try {
      const progressResults = await Promise.all(
        workflowIds.map(id => fetchWorkflowProgress(id))
      );

      // Update progress states based on results
      progressResults.forEach((progress, index) => {
        const id = workflowIds[index];
        if (progress !== null) {
          if (id === 'eed') setEedProgress(progress);
          else if (id === 'taxonomy') setTaxonomyProgress(progress);
          else if (id === 'coc') setCocProgress(progress);
          else if (id === 'iso14001') setIso14001Progress(progress);
          else if (id === 'iso9001') setIso9001Progress(progress);
          else if (id === 'iso27001') setIso27001Progress(progress);
          else if (id === 'environmental') setEnvironmentalProgress(progress);
        }
      });
    } catch (error) {
      console.error('Error fetching workflow progress:', error);
      displayToast('Failed to fetch workflow progress', 'error');
    }
  }, []);

  // Call on component mount
  useEffect(() => {
    fetchAllWorkflowProgress();
  }, [fetchAllWorkflowProgress]);
  // Mock data for workflows with critical documents added
  const complianceFrameworks = [
    {
      id: 'eed',
      title: 'Energy Efficiency Directive',
      progress: Number(eedProgress.toFixed(2)), // Fetch progress dynamically
      auditReadiness: Number(Math.max(0, (eedProgress - 2.0)).toFixed(2)), // 32 Added audit readiness score
      questionsTotal: 105,
      questionsAnswered: 47,
      lastUpdated: '2025-02-15',
      status: 'in-progress',
      sections: [
        { name: 'Company Overview', progress: 100 },
        { name: 'Energy Consumption Analysis', progress: 80 },
        { name: 'Implemented Measures', progress: 60 },
        { name: 'External Transport', progress: 30 },
        { name: 'Energy-Saving Measures', progress: 20 },
        { name: 'Detailed Findings', progress: 10 }
      ],
      criticalDocuments: [
        { id: 'd1', name: 'Energy Audit Report 2024', status: 'required', description: 'Latest energy audit conducted by certified auditor' },
        { id: 'd2', name: 'Energy Consumption Data', status: 'required', description: 'Monthly energy consumption for the past 4 years' },
        { id: 'd3', name: 'Energy Management Policy', status: 'required', description: 'Current company energy management policy document' },
        { id: 'd4', name: 'Building Technical Specs', status: 'optional', description: 'Technical specifications of facility buildings' },
        { id: 'd5', name: 'Equipment Inventory', status: 'recommended', description: 'Inventory of all energy-consuming equipment' }
      ]
    },
    {
      id: 'taxonomy',
      title: 'EU Taxonomy',
      progress: Number(taxonomyProgress.toFixed(2)), // 58 Fetch progress dynamically
      auditReadiness: Number(Math.max(0, (taxonomyProgress - 4.67)).toFixed(2)), // 58 Added audit readiness score
      questionsTotal: 78,
      questionsAnswered: 48,
      lastUpdated: '2025-02-10',
      status: 'in-progress',
      sections: [
        { name: 'Substantial Contribution', progress: 75 },
        { name: 'Do No Significant Harm', progress: 65 },
        { name: 'Minimum Safeguards', progress: 45 }
      ],
      criticalDocuments: [
        { id: 'd1', name: 'Climate Risk Assessment', status: 'required', description: 'Assessment of climate-related physical and transition risks' },
        { id: 'd2', name: 'Technical Screening Evidence', status: 'required', description: 'Evidence of meeting technical screening criteria' },
        { id: 'd3', name: 'DNSH Compliance Documents', status: 'required', description: 'Documentation proving compliance with DNSH criteria' },
        { id: 'd4', name: 'Human Rights Policy', status: 'recommended', description: 'Company human rights policy and implementation evidence' },
        { id: 'd5', name: 'Revenue Allocation Report', status: 'required', description: 'Report on revenue allocation to taxonomy activities' }
      ]
        },
        {
      id: 'coc',
      title: 'EU Code of Conduct',
      progress: Number(cocProgress.toFixed(2)),
      auditReadiness: Number(Math.max(0, (cocProgress - 1.31)).toFixed(2)), // 65 Added audit readiness score
      questionsTotal: 94,
      questionsAnswered: 73,
      lastUpdated: '2025-01-28',
      status: 'in-progress',
      sections: [
        { name: 'Data Center Efficiency', progress: 90 },
        { name: 'IT Equipment and Services', progress: 85 },
        { name: 'Cooling', progress: 75 },
        { name: 'Power Equipment', progress: 60 }
      ],
      criticalDocuments: [
        { id: 'd1', name: 'PUE Reports', status: 'required', description: 'Power Usage Effectiveness reports for last 12 months' },
        { id: 'd2', name: 'Cooling System Specifications', status: 'required', description: 'Technical specifications of cooling systems' },
        { id: 'd3', name: 'Server Utilization Data', status: 'recommended', description: 'Data on server utilization and virtualization' },
        { id: 'd4', name: 'Energy Monitoring Procedures', status: 'required', description: 'Procedures for monitoring energy consumption' },
        { id: 'd5', name: 'IT Equipment Inventory', status: 'optional', description: 'Inventory of all IT equipment with efficiency ratings' }
      ]
    }
  ];

  const isoStandards = [
    {
      id: 'iso14001',
      title: 'ISO 14001 Environmental Management Systems (EMS)',
      progress: Number(iso14001Progress).toFixed(2), // Fetch progress dynamically
      auditReadiness: Number(Math.max(0, (iso14001Progress - 20.0)).toFixed(2)), // 82 Added audit readiness score
      questionsTotal: 112,
      questionsAnswered: 101,
      lastUpdated: '2025-02-05',
      status: 'in-progress',
      sections: [
        { name: 'Environmental Policy', progress: 100 },
        { name: 'Planning', progress: 95 },
        { name: 'Implementation', progress: 85 },
        { name: 'Performance Evaluation', progress: 80 }
      ],
      criticalDocuments: [
        { id: 'd1', name: 'Environmental Policy Document', status: 'required', description: 'Official environmental policy signed by leadership' },
        { id: 'd2', name: 'Environmental Aspects Register', status: 'required', description: 'Register of environmental aspects and impacts' },
        { id: 'd3', name: 'Legal Compliance Register', status: 'required', description: 'Register of applicable environmental legislation' },
        { id: 'd4', name: 'Management Review Minutes', status: 'recommended', description: 'Minutes from latest management review meeting' },
        { id: 'd5', name: 'Environmental Objectives', status: 'required', description: 'Documentation of environmental objectives and targets' }
      ]
    },
    {
      id: 'iso9001',
      title: 'ISO 9001 Quality Management Systems (QMS)',
      progress: Number(iso9001Progress).toFixed(2), // Fetch progress dynamically
      auditReadiness: Number(Math.max(0, (iso9001Progress - 9.0)).toFixed(2)), // 90 Added audit readiness score
      questionsTotal: 98,
      questionsAnswered: 93,
      lastUpdated: '2025-01-15',
      status: 'complete',
      sections: [
        { name: 'Context of the Organization', progress: 100 },
        { name: 'Leadership', progress: 100 },
        { name: 'Planning', progress: 95 },
        { name: 'Support', progress: 90 },
        { name: 'Operation', progress: 90 }
      ],
      criticalDocuments: [
        { id: 'd1', name: 'Quality Manual', status: 'required', description: 'Overall quality management system manual' },
        { id: 'd2', name: 'Process Maps', status: 'required', description: 'Documented process maps and interactions' },
        { id: 'd3', name: 'Internal Audit Reports', status: 'required', description: 'Recent internal quality audit reports' },
        { id: 'd4', name: 'Corrective Action Register', status: 'recommended', description: 'Register of corrective actions and their status' },
        { id: 'd5', name: 'Customer Feedback Data', status: 'optional', description: 'Collected customer feedback and satisfaction data' }
      ]
    },
    {
      id: 'iso27001',
      title: 'ISO 27001 Information Security Management Systems (ISMS)',
      progress: Number(iso27001Progress).toFixed(2), // Fetch progress dynamically
      auditReadiness: Number(Math.max(0, (iso27001Progress - 12)).toFixed(2)), //77 Added audit readiness score
      questionsTotal: 130,
      questionsAnswered: 110,
      lastUpdated: '2025-02-01',
      status: 'in-progress',
      sections: [
        { name: 'Security Policy', progress: 100 },
        { name: 'Organization of Information Security', progress: 95 },
        { name: 'Asset Management', progress: 90 },
        { name: 'Access Control', progress: 80 },
        { name: 'Cryptography', progress: 75 }
      ],
      criticalDocuments: [
        { id: 'd1', name: 'Information Security Policy', status: 'required', description: 'Official information security policy document' },
        { id: 'd2', name: 'Risk Assessment Report', status: 'required', description: 'Information security risk assessment report' },
        { id: 'd3', name: 'Statement of Applicability', status: 'required', description: 'SoA listing all selected controls' },
        { id: 'd4', name: 'Business Continuity Plan', status: 'recommended', description: 'Plan for business continuity in case of incidents' },
        { id: 'd5', name: 'Security Incident Register', status: 'required', description: 'Register of security incidents and responses' }
      ]
    }
  ];
  
  // Environmental permits data
  const permits = {
    active: [
      {
        id: 'water-dublin',
        title: 'Water Usage Permit - Dublin',
        type: 'Water',
        reference: 'WP-DUB-2025-042',
        status: 'Under Review',
        expiration: '2028-05-15',
        lastUpdated: '2025-03-10',
        owner: 'Operations Team',
        site: 'Dublin Data Center',
        description: 'Permit for water usage and discharge at Dublin facility',
        progress: 0.00, //Number(environmentalProgress).toFixed(2),
        auditReadiness: 0.00, //Number(Math.max(0, (environmentalProgress - 12)).toFixed(2)), // Added audit readiness score
        tasks: [
          { id: 1, title: 'Submit initial application', status: 'completed', assignee: 'Jane Smith', dueDate: '2025-01-15' },
          { id: 2, title: 'Environmental impact assessment', status: 'completed', assignee: 'Environmental Consultant', dueDate: '2025-02-10' },
          { id: 3, title: 'Local authority review feedback', status: 'in-progress', assignee: 'Operations Manager', dueDate: '2025-04-05' },
          { id: 4, title: 'Final approval', status: 'pending', assignee: 'Regulatory Affairs', dueDate: '2025-05-01' }
        ],
        documents: [
          { id: 'd1', name: 'Initial Application Form.pdf', version: '1.0', uploadedBy: 'Jane Smith', date: '2025-01-15' },
          { id: 'd2', name: 'Water Usage Projections.xlsx', version: '2.1', uploadedBy: 'Engineering Team', date: '2025-01-30' },
          { id: 'd3', name: 'Environmental Impact Report.pdf', version: '1.0', uploadedBy: 'Environmental Consultant', date: '2025-02-10' },
          { id: 'd4', name: 'Authority Feedback.pdf', version: '1.0', uploadedBy: 'Maria Rivas', date: '2025-03-10' }
        ],
        criticalDocuments: [
          { id: 'd1', name: 'Water Usage Analysis', status: 'required', description: 'Analysis of water usage and discharge quantities' },
          { id: 'd2', name: 'Environmental Impact Statement', status: 'required', description: 'Environmental impact assessment document' },
          { id: 'd3', name: 'Water Treatment Plans', status: 'required', description: 'Plans for water treatment and recycling' },
          { id: 'd4', name: 'Chemical Inventory', status: 'recommended', description: 'Inventory of chemicals used in water treatment' },
          { id: 'd5', name: 'Discharge Monitoring Plan', status: 'required', description: 'Plan for monitoring water discharge quality' }
        ],
        history: [
          { date: '2025-01-15', user: 'Jane Smith', action: 'Created permit application', notes: 'Initial submission for Dublin facility' },
          { date: '2025-02-10', user: 'Environmental Consultant', action: 'Updated application with impact assessment', notes: 'Added comprehensive water usage impact analysis' },
          { date: '2025-03-10', user: 'Maria Rivas', action: 'Added authority feedback', notes: 'Received initial comments from local water authority' },
          { date: '2025-03-15', user: 'Operations Manager', action: 'Updated water reclamation plans', notes: 'Revised water reclamation percentage from 75% to 85%' }
        ],
        assignees: [
          { role: 'Permit Owner', name: 'Operations Manager', team: 'Operations' },
          { role: 'Technical Lead', name: 'Senior Engineer', team: 'Construction' },
          { role: 'Compliance Monitor', name: 'Compliance Officer', team: 'Legal' },
          { role: 'Executive Sponsor', name: 'COO', team: 'Executive' }
        ]
      },
      // Other permits data remains the same
    ],
    renewal: [
      // Renewal permits data remains the same
    ],
    completed: [
      // Completed permits data remains the same
    ]
  };

  // Handler for starting a workflow
  const handleStartWorkflow = (workflow) => {
    // In a real implementation, this would call your Python backend
    console.log(`Starting workflow: ${workflow.id}`);
    
    // Navigate to the workflow wizard
    window.open(`/workflowwizard?workflow=${workflow.id}`, '_blank', 'noopener,noreferrer');
  };

  // Handler for viewing workflow details
  const handleViewDetails = (workflow) => {
    setCurrentWorkflow(workflow);
    setShowDetailsModal(true);
    
    // Update presence using Liveblocks directly
    handleWorkflowView(workflow.id);
  };

  // Updated handler for document upload
  const handleDocumentUpload = (workflow) => {
    console.log(`[WorkflowsPage] Opening document upload for: ${workflow.id}`);
    setCurrentWorkflow(workflow);
    setShowDocumentModal(true);
    
    // Update presence using Liveblocks to show we're viewing this workflow's documents
    handleWorkflowView(workflow.id);
  };

  // Updated handler for uploading a document
  const handleUploadDocument = async (workflowId, documentId) => {
    // Find the workflow
    let targetWorkflow;
    if (mainSection === 'compliance') {
      targetWorkflow = complianceFrameworks.find(w => w.id === workflowId);
    } else if (mainSection === 'iso') {
      targetWorkflow = isoStandards.find(w => w.id === workflowId);
    } else if (mainSection === 'environmental') {
      targetWorkflow = permits[environmentalActiveTab].find(p => p.id === workflowId);
    }
    
    if (!targetWorkflow) {
      console.error(`[WorkflowsPage] Workflow with ID ${workflowId} not found`);
      return;
    }
    
    // Find the critical document
    const criticalDoc = targetWorkflow.criticalDocuments.find(d => d.id === documentId);
    if (!criticalDoc) {
      console.error(`[WorkflowsPage] Document with ID ${documentId} not found in workflow ${workflowId}`);
      return;
    }
    
    console.log(`[WorkflowsPage] Uploading document ${criticalDoc.name} for workflow ${targetWorkflow.title}`);
    
    try {
      // Create file input for selecting file
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.pdf,.docx,.xlsx,.csv,.txt,.jpg,.png';
      
      // Set up file selection handler
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          // Set upload in progress
          setUploadProgress({
            ...uploadProgress,
            [`${workflowId}-${documentId}`]: true
          });
          
          // Determine category based on workflow type
          let category;
          if (targetWorkflow.title.includes('ISO')) {
            category = 'iso-standards';
          } else if (targetWorkflow.title.includes('Permit')) {
            category = 'environmental-permits';
          } else {
            category = 'compliance-workflow';
          }
          
          // Attach critical document name for tracking
          file.criticalDocName = criticalDoc.name;
          
          // Process file using FileUploadService
          const processedFile = await fileUploadService.processFile(file);
          
          // Show progress toast
          displayToast(`Uploading "${criticalDoc.name}"...`);
          
          // Create interval to check upload progress
          const progressInterval = setInterval(() => {
            const updatedFile = fileUploadService.getFileDisplayInfo(processedFile.id);
            
            if (updatedFile && (updatedFile.status === 'processed' || updatedFile.status === 'uploaded' || 
                                updatedFile.status === 'complete' || updatedFile.status === 'error')) {
              // Clear interval when complete
              clearInterval(progressInterval);
              
              // Update UI state
              setUploadProgress({
                ...uploadProgress,
                [`${workflowId}-${documentId}`]: false
              });
              
              setUploadComplete({
                ...uploadComplete,
                [`${workflowId}-${documentId}`]: (updatedFile.status === 'processed' || 
                                               updatedFile.status === 'uploaded' ||
                                               updatedFile.status === 'complete')
              });
              
              // Update the audit readiness score after successful upload
              if (updatedFile.status === 'processed' || updatedFile.status === 'uploaded' || updatedFile.status === 'complete') {
                displayToast(`Document "${criticalDoc.name}" uploaded successfully`);
                
                // Update audit readiness score
                updateAuditReadinessScore(workflowId, 5, 15);
              } else {
                displayToast(`Error uploading document: ${updatedFile.error || 'Unknown error'}`, 'error');
              }
            }
          }, 500);
        } catch (error) {
          console.error('[WorkflowsPage] Error in file upload:', error);
          
          // Reset progress state
          setUploadProgress({
            ...uploadProgress,
            [`${workflowId}-${documentId}`]: false
          });
          
          // Show error toast
          displayToast(`Error uploading document: ${error.message}`, 'error');
        }
      };
      
      // Trigger file selection dialog
      fileInput.click();
    } catch (error) {
      console.error('[WorkflowsPage] Error initiating file upload:', error);
      displayToast(`Error: ${error.message}`, 'error');
    }
  };

  // Helper function to update audit readiness score
  const updateAuditReadinessScore = (workflowId, minIncrement = 5, maxIncrement = 15) => {
    // Calculate random increment between min and max
    const increment = Math.floor(Math.random() * (maxIncrement - minIncrement + 1)) + minIncrement;
    
    if (mainSection === 'compliance') {
      // Find index of workflow
      const index = complianceFrameworks.findIndex(w => w.id === workflowId);
      if (index !== -1) {
        // Increment audit readiness score
        const newScore = Math.min(complianceFrameworks[index].auditReadiness + increment, 100);
        complianceFrameworks[index].auditReadiness = newScore;
      }
    } else if (mainSection === 'iso') {
      const index = isoStandards.findIndex(w => w.id === workflowId);
      if (index !== -1) {
        const newScore = Math.min(isoStandards[index].auditReadiness + increment, 100);
        isoStandards[index].auditReadiness = newScore;
      }
    } else if (mainSection === 'environmental') {
      const index = permits[environmentalActiveTab].findIndex(p => p.id === workflowId);
      if (index !== -1) {
        const newScore = Math.min(permits[environmentalActiveTab][index].auditReadiness + increment, 100);
        permits[environmentalActiveTab][index].auditReadiness = newScore;
      }
    }
  };

  // Handler for upload completion callback from DocumentUploadModal
  const handleUploadComplete = (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0 || !currentWorkflow) return;
    
    console.log(`[WorkflowsPage] Upload completed for ${uploadedFiles.length} files in workflow: ${currentWorkflow.id}`);
    
    // Count successful uploads
    const successfulUploads = uploadedFiles.filter(file => 
      file.status === 'processed' || file.status === 'uploaded' || file.status === 'complete'
    ).length;
    
    if (successfulUploads > 0) {
      // Boost audit readiness score based on number of files
      // More documents = bigger boost
      const boostAmount = Math.min(successfulUploads * 5, 20); // Cap at 20%
      updateAuditReadinessScore(currentWorkflow.id, boostAmount, boostAmount);
      
      // Show success toast
      displayToast(`${successfulUploads} ${successfulUploads === 1 ? 'document' : 'documents'} uploaded successfully`);
    }
  };

  // Handler for generating a report
  const handleGenerateReport = (workflow) => {
    // In a real implementation, this would call your Python backend
    console.log(`Generating report for: ${workflow.id}`);
    
    // Simulate report generation
    setTimeout(() => {
      setReportGenerated({
        ...reportGenerated,
        [workflow.id]: true
      });
      
      // Show report modal
      setCurrentWorkflow(workflow);
      setShowReportModal(true);
      
      // Update presence when viewing the report
      handleWorkflowView(workflow.id);
    }, 1000);
  };

  // Environmental Permit handlers
  const handleViewPermit = (permit) => {
    setSelectedPermit(permit);
    setShowPermitDetails(true);
    
    // Update presence to show we're viewing this permit
    handleWorkflowView(permit.id);
  };

  const handleAssignRoles = (permit) => {
    setSelectedPermit(permit);
    setShowAssignModal(true);
    
    // Update presence for this permit
    handleWorkflowView(permit.id);
  };

  const handleViewHistory = (permit) => {
    setSelectedPermit(permit);
    setShowHistoryModal(true);
    
    // Update presence for this permit
    handleWorkflowView(permit.id);
  };
  
  // Clear viewing presence when closing modals
  const handleCloseModals = () => {
    // Reset all modals
    setShowDetailsModal(false);
    setShowDocumentModal(false);
    setShowReportModal(false);
    setShowPermitDetails(false);
    setShowAssignModal(false);
    setShowHistoryModal(false);
    
    // Clear presence
    handleWorkflowView(null);
  };
 // Workflow card component with added document upload button and second progress bar
 const WorkflowCard = ({ workflow, category }) => {
  // Get users who are currently viewing this workflow
  const viewingUsers = workflowsBeingViewed[workflow.id] || [];
  
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "0.5rem",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
      position: "relative" // Add position relative for viewing indicators
    }}>
      {/* Add viewing indicators when other users are looking at this workflow */}
      {viewingUsers.length > 0 && (
        <div className="viewing-indicator" style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          display: "flex",
          zIndex: 5
        }}>
          {viewingUsers.map((viewingUser, idx) => (
            <div
              key={idx}
              title={`${viewingUser.name || viewingUser.email} is viewing this workflow`}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ff9800",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                marginRight: "-8px",
                border: "2px solid white",
                zIndex: idx + 1,
                position: "relative"
              }}
            >
              {(viewingUser.name || viewingUser.email || "?").charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ padding: "1.5rem" }}>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: 500,
          color: "#111827",
          marginBottom: "0.5rem"
        }}>{workflow.title}</h3>
        
        {/* First progress bar - Question Completion */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem"
        }}>
          <span style={{
            fontSize: "0.875rem",
            color: "#6b7280"
          }}>Question Completion</span>
          <span style={{
            fontSize: "0.875rem",
            fontWeight: 500
          }}>{workflow.progress}%</span>
        </div>
        
        <div style={{
          width: "100%",
          backgroundColor: "#e5e7eb",
          borderRadius: "0.375rem",
          height: "0.625rem",
          marginBottom: "1rem"
        }}>
          <div 
            style={{
              backgroundColor: "#3b82f6",
              height: "0.625rem",
              borderRadius: "0.375rem",
              width: `${workflow.progress}%`
            }}
          ></div>
        </div>
        
        {/* Second progress bar - Audit Readiness Score */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem"
        }}>
          <span style={{
            fontSize: "0.875rem",
            color: "#6b7280"
          }}>Audit Readiness Score</span>
          <span style={{
            fontSize: "0.875rem",
            fontWeight: 500
          }}>{workflow.auditReadiness}%</span>
        </div>
        
        <div style={{
          width: "100%",
          backgroundColor: "#e5e7eb",
          borderRadius: "0.375rem",
          height: "0.625rem",
          marginBottom: "1rem"
        }}>
          <div 
            style={{
              backgroundColor: "#10b981",
              height: "0.625rem",
              borderRadius: "0.375rem",
              width: `${workflow.auditReadiness}%`
            }}
          ></div>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <span style={{
            fontSize: "0.75rem",
            color: "#6b7280"
          }}>
            Last updated: {workflow.lastUpdated}
          </span>
        </div>
        
        <div style={{
          display: "flex",
          gap: "0.75rem"
        }}>
          <button
            onClick={() => handleViewDetails(workflow)}
            style={{
              flex: 1,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "white",
              cursor: "pointer"
            }}
          >
            View Details
          </button>
          
          <button
            onClick={() => handleDocumentUpload(workflow)}
            style={{
              flex: 1,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center", 
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "white",
              cursor: "pointer"
            }}
          >
            Documents
          </button>
          
          <button
            onClick={() => handleStartWorkflow(workflow)}
            style={{
              flex: 1,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              border: "none",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "white",
              backgroundColor: "#9333ea",
              cursor: "pointer"
            }}
          >
            {workflow.status === 'complete' ? 'Review' : 'Start Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  let color = '#9333ea'; // Default purple
  
  if (status.includes('Review') || status.includes('Documentation') || status.includes('Required')) {
    color = '#f59e0b'; // Amber
  } else if (status.includes('Awaiting') || status.includes('progress')) {
    color = '#3b82f6'; // Blue
  } else if (status.includes('Approved') || status.includes('completed')) {
    color = '#10b981'; // Green
  }
  
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
      fontWeight: '500',
      color: 'white',
      backgroundColor: color,
      borderRadius: '0.375rem'
    }}>
      {status}
    </span>
  );
};

// PermitCard component that aligns with other workflow card designs
const PermitCard = ({ permit }) => {
  // Get users who are currently viewing this permit
  const viewingUsers = workflowsBeingViewed[permit.id] || [];
  
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "0.5rem",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
      position: "relative" // Add position relative for viewing indicators
    }}>
      {/* Add viewing indicators when other users are looking at this workflow */}
      {viewingUsers.length > 0 && (
        <div className="viewing-indicator" style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          display: "flex",
          zIndex: 5
        }}>
          {viewingUsers.map((viewingUser, idx) => (
            <div
              key={idx}
              title={`${viewingUser.name || viewingUser.email} is viewing this permit`}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ff9800",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                marginRight: "-8px",
                border: "2px solid white",
                zIndex: idx + 1,
                position: "relative"
              }}
            >
              {(viewingUser.name || viewingUser.email || "?").charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ padding: "1.5rem" }}>
        <h3 style={{
          fontSize: "1.125rem",
          fontWeight: 500,
          color: "#111827",
          marginBottom: "0.5rem"
        }}>{permit.title}</h3>
        
        {/* Display permit type and status as tags */}
        <div style={{
          display: "flex", 
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem"
        }}>
          <span style={{
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "0.25rem",
            backgroundColor: "#f3f4f6",
            color: "#4b5563"
          }}>
            {permit.type}
          </span>
          
          <span style={{
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "0.25rem",
            backgroundColor: 
              permit.status === "Under Review" ? "#fef3c7" : 
              permit.status === "Approved" ? "#d1fae5" :
              permit.status === "Rejected" ? "#fee2e2" :
              "#f3f4f6",
            color: 
              permit.status === "Under Review" ? "#92400e" : 
              permit.status === "Approved" ? "#065f46" :
              permit.status === "Rejected" ? "#991b1b" :
              "#4b5563"
          }}>
            {permit.status}
          </span>
        </div>
        
        {/* First progress bar - Question Completion */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem"
        }}>
          <span style={{
            fontSize: "0.875rem",
            color: "#6b7280"
          }}>Completion Progress</span>
          <span style={{
            fontSize: "0.875rem",
            fontWeight: 500
          }}>{permit.progress}%</span>
        </div>
        
        <div style={{
          width: "100%",
          backgroundColor: "#e5e7eb",
          borderRadius: "0.375rem",
          height: "0.625rem",
          marginBottom: "1rem"
        }}>
          <div 
            style={{
              backgroundColor: "#3b82f6",
              height: "0.625rem",
              borderRadius: "0.375rem",
              width: `${permit.progress}%`
            }}
          ></div>
        </div>
        
        {/* Second progress bar - Audit Readiness Score */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem"
        }}>
          <span style={{
            fontSize: "0.875rem",
            color: "#6b7280"
          }}>Audit Readiness Score</span>
          <span style={{
            fontSize: "0.875rem",
            fontWeight: 500
          }}>{permit.auditReadiness}%</span>
        </div>
        
        <div style={{
          width: "100%",
          backgroundColor: "#e5e7eb",
          borderRadius: "0.375rem",
          height: "0.625rem",
          marginBottom: "1rem"
        }}>
          <div 
            style={{
              backgroundColor: "#10b981",
              height: "0.625rem",
              borderRadius: "0.375rem",
              width: `${permit.auditReadiness}%`
            }}
          ></div>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <span style={{
            fontSize: "0.75rem",
            color: "#6b7280"
          }}>
            Last updated: {typeof permit.lastUpdated === 'string' ? 
              new Date(permit.lastUpdated).toLocaleDateString() : 
              permit.lastUpdated}
          </span>
        </div>
        
        <div style={{
          display: "flex",
          gap: "0.75rem"
        }}>
          <button
            onClick={() => handleViewPermit(permit)}
            style={{
              flex: 1,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "white",
              cursor: "pointer"
            }}
          >
            View Details
          </button>
          
          <button
            onClick={() => handleDocumentUpload(permit)}
            style={{
              flex: 1,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center", 
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "white",
              cursor: "pointer"
            }}
          >
            Documents
          </button>
          
          <button
            onClick={() => {
              // Create a workflow object with the ID for environmental permit
              const workflowObj = {
                id: "environmental",
                title: permit.title
              };
              
              // Call the standard handleStartWorkflow function
              handleStartWorkflow(workflowObj);
            }}
            style={{
              flex: 1,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              border: "none",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "white",
              backgroundColor: "#9333ea",
              cursor: "pointer"
            }}
          >
            {permit.progress > 0 ? 'Continue Workflow' : 'Start Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Render the Environmental Permits section
const EnvironmentalPermitsSection = () => {
  // States for managing tabs
  const [activeTab, setActiveTab] = useState('active');
  
  return (
    <section style={{ marginBottom: "3rem" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <h2 style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "#1f2937"
        }}>Environmental Permit Workflows</h2>
        
        <button style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.5rem 1rem",
          border: "none",
          borderRadius: "0.375rem",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "white",
          backgroundColor: "#9333ea",
          cursor: "pointer"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.5rem" }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Permit
        </button>
      </div>
      
      {/* Tab navigation */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #e5e7eb",
        marginBottom: "1.5rem"
      }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: "0.5rem 1rem",
            fontWeight: 500,
            fontSize: "0.875rem",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: activeTab === 'active' ? "2px solid #9333ea" : "2px solid transparent",
            color: activeTab === 'active' ? "#9333ea" : "#6b7280",
            cursor: "pointer"
          }}
        >
          Active Permits ({permits.active.length})
        </button>
        <button onClick={() => setActiveTab('renewal')} 
                style={{
                  padding: "0.5rem 1rem",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: activeTab === 'renewal' ? "2px solid #9333ea" : "2px solid transparent",
                  color: activeTab === 'renewal' ? "#9333ea" : "#6b7280",
                  cursor: "pointer"
                }}>
          Renewal Required ({permits.renewal.length})
        </button>
        <button onClick={() => setActiveTab('completed')} 
                style={{
                  padding: "0.5rem 1rem",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: activeTab === 'completed' ? "2px solid #9333ea" : "2px solid transparent",
                  color: activeTab === 'completed' ? "#9333ea" : "#6b7280",
                  cursor: "pointer"
                }}>
          Completed ({permits.completed.length})
        </button>
      </div>
      
      {/* Permit cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(1, 1fr)",
        gap: "1.5rem"
      }}>
        {permits[activeTab].map(permit => (
          <PermitCard 
            key={permit.id} 
            permit={permit} 
          />
        ))}
      </div>
    </section>
  );
};

// Modal component for workflow details
const WorkflowDetailsModal = ({ workflow, onClose }) => {
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
        maxWidth: "56rem",
        maxHeight: "90vh",
        overflow: "auto"
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
          }}>{workflow.title} Details</h2>
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
        
        <div style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem"
            }}>
              <h3 style={{ 
                fontSize: "1.125rem", 
                fontWeight: 500 
              }}>Question Completion</h3>
              <span style={{ 
                fontSize: "1.125rem", 
                fontWeight: 700 
              }}>{workflow.progress}%</span>
            </div>
            <div style={{
              width: "100%",
              backgroundColor: "#e5e7eb",
              borderRadius: "0.375rem",
              height: "0.625rem"
            }}>
              <div 
                style={{
                  backgroundColor: "#3b82f6",
                  height: "0.625rem",
                  borderRadius: "0.375rem",
                  width: `${workflow.progress}%`
                }}
              ></div>
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.25rem"
            }}>
              {workflow.questionsAnswered} of {workflow.questionsTotal} questions answered
            </div>
          </div>
          
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem"
            }}>
              <h3 style={{ 
                fontSize: "1.125rem", 
                fontWeight: 500 
              }}>Audit Readiness Score</h3>
              <span style={{ 
                fontSize: "1.125rem", 
                fontWeight: 700 
              }}>{workflow.auditReadiness}%</span>
            </div>
            <div style={{
              width: "100%",
              backgroundColor: "#e5e7eb",
              borderRadius: "0.375rem",
              height: "0.625rem"
            }}>
              <div 
                style={{
                  backgroundColor: "#10b981",
                  height: "0.625rem",
                  borderRadius: "0.375rem",
                  width: `${workflow.auditReadiness}%`
                }}
              ></div>
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.25rem"
            }}>
              Based on document completeness and question responses
            </div>
          </div>
          
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ 
              fontSize: "1.125rem", 
              fontWeight: 500, 
              marginBottom: "1rem" 
            }}>Section Progress</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {workflow.sections.map((section, index) => (
                <div key={index}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.25rem"
                  }}>
                    <span style={{ fontWeight: 500 }}>{section.name}</span>
                    <span>{section.progress}%</span>
                  </div>
                  <div style={{
                    width: "100%",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "0.25rem",
                    height: "0.5rem"
                  }}>
                    <div 
                      style={{
                        backgroundColor: "#3b82f6",
                        height: "0.5rem",
                        borderRadius: "0.25rem",
                        width: `${section.progress}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ 
              fontSize: "1.125rem", 
              fontWeight: 500, 
              marginBottom: "0.5rem" 
            }}>Recent Activity</h3>
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
                      padding: "0.75rem 1.5rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Date</th>
                    <th style={{
                      padding: "0.75rem 1.5rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>User</th>
                    <th style={{
                      padding: "0.75rem 1.5rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{
                      padding: "1rem 1.5rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb"
                    }}>{workflow.lastUpdated}</td>
                    <td style={{
                      padding: "1rem 1.5rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb"
                    }}>John Doe</td>
                    <td style={{
                      padding: "1rem 1.5rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb"
                    }}>Updated question responses</td>
                  </tr>
                  <tr>
                    <td style={{
                      padding: "1rem 1.5rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb"
                    }}>2025-01-30</td>
                    <td style={{
                      padding: "1rem 1.5rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb"
                    }}>Jane Smith</td>
                    <td style={{
                      padding: "1rem 1.5rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb"
                    }}>Added documentation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem"
          }}>
            <button
              onClick={() => handleStartWorkflow(workflow)}
              style={{
                display: "inline-flex",
                alignItems: "center",
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
              Continue Workflow
            </button>
            
            {workflow.progress >= 80 && (
              <button
                onClick={() => {
                  onClose();
                  handleGenerateReport(workflow);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "0.375rem",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "white",
                  backgroundColor: "#10b981",
                  cursor: "pointer"
                }}
              >
                Generate Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Permit details modal
const PermitDetailsModal = ({ permit, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!permit) return null;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        width: '91.666667%',
        maxWidth: '64rem',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 600,
              marginBottom: '0.25rem'
            }}>{permit.title}</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>{permit.reference}</span>
              <StatusBadge status={permit.status} />
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              color: '#6b7280',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex' }}>
          <button
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'overview' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'tasks' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'tasks' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
          <button
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'documents' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'documents' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'team' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'team' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('team')}
          >
            Team
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {/* Tab content would go here */}
          {activeTab === 'overview' && (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600,
                    marginBottom: '0.5rem'
                  }}>Permit Details</h3>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'max-content 1fr',
                      gap: '0.5rem',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ color: '#6b7280' }}>Type:</span>
                      <span style={{ fontWeight: 500 }}>{permit.type}</span>
                      
                      <span style={{ color: '#6b7280' }}>Reference:</span>
                      <span style={{ fontWeight: 500 }}>{permit.reference}</span>
                      
                      <span style={{ color: '#6b7280' }}>Site:</span>
                      <span style={{ fontWeight: 500 }}>{permit.site}</span>
                      
                      <span style={{ color: '#6b7280' }}>Status:</span>
                      <span style={{ fontWeight: 500 }}>{permit.status}</span>
                      
                      <span style={{ color: '#6b7280' }}>Expiration:</span>
                      <span style={{ fontWeight: 500 }}>{new Date(permit.expiration).toLocaleDateString()}</span>
                      
                      <span style={{ color: '#6b7280' }}>Owner:</span>
                      <span style={{ fontWeight: 500 }}>{permit.owner}</span>
                      
                      <span style={{ color: '#6b7280' }}>Last Updated:</span>
                      <span style={{ fontWeight: 500 }}>{new Date(permit.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600,
                    marginBottom: '0.5rem'
                  }}>Progress</h3>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}>
                    {/* Completion Progress */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Completion Progress</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{permit.progress}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '0.25rem',
                        height: '0.5rem'
                      }}>
                        <div 
                          style={{
                            backgroundColor: '#3b82f6',
                            height: '0.5rem',
                            borderRadius: '0.25rem',
                            width: `${permit.progress}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Audit Readiness */}
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Audit Readiness Score</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{permit.auditReadiness}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '0.25rem',
                        height: '0.5rem'
                      }}>
                        <div 
                          style={{
                            backgroundColor: '#10b981',
                            height: '0.5rem',
                            borderRadius: '0.25rem',
                            width: `${permit.auditReadiness}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Other overview content */}
            </div>
          )}
          
          {/* Other tabs would go here */}
        </div>
        
        <div style={{
          borderTop: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          
          <button
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#3b82f6',
              cursor: 'pointer'
            }}
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
};

// AssignRolesModal component with local state for invitation functionality
const AssignRolesModal = ({ permit, onClose }) => {
  // Local state for form fields in the modal
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [localIsLoading, setLocalIsLoading] = useState(false);
  
  if (!permit) return null;
  
  const handleInviteNewMember = async () => {
    setLocalIsLoading(true);
    
    const success = await sendInvitation(inviteEmail);
    
    if (success) {
      // Extract name from email (for display purposes)
      const name = inviteEmail.split('@')[0].split('.').map(
        part => part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
      
      // Clear the input field
      setInviteEmail('');
      
      // Could implement additional logic here to add the invited user
      // to the permit's assignees list if needed
    }
    
    setLocalIsLoading(false);
  };
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        width: '91.666667%',
        maxWidth: '32rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 600
          }}>Assign Roles</h2>
          <button 
            onClick={onClose}
            style={{
              color: '#6b7280',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}>Current Assignments</h3>
            
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <tbody>
                  {permit.assignees.map((assignee, index) => (
                    <tr key={index}>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        borderBottom: index < permit.assignees.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        {assignee.role}
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        borderBottom: index < permit.assignees.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        {assignee.name}
                        <span style={{
                          marginLeft: '0.5rem',
                          display: 'inline-block',
                          padding: '0.125rem 0.375rem',
                          backgroundColor: 
                            assignee.team === 'Operations' ? '#dbeafe' : 
                            assignee.team === 'Construction' ? '#fef3c7' : 
                            assignee.team === 'Legal' ? '#e0e7ff' : 
                            assignee.team === 'Engineering' ? '#dcfce7' : 
                            assignee.team === 'Sustainability' ? '#d1fae5' : 
                            assignee.team === 'Executive' ? '#fee2e2' : '#f3f4f6',
                          color: 
                            assignee.team === 'Operations' ? '#1e40af' : 
                            assignee.team === 'Construction' ? '#92400e' : 
                            assignee.team === 'Legal' ? '#3730a3' : 
                            assignee.team === 'Engineering' ? '#166534' : 
                            assignee.team === 'Sustainability' ? '#065f46' : 
                            assignee.team === 'Executive' ? '#991b1b' : '#4b5563',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {assignee.team}
                        </span>
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                        borderBottom: index < permit.assignees.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        <button style={{
                          padding: '0.25rem',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#6b7280',
                          cursor: 'pointer'
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ 
                fontSize: '1rem', 
                fontWeight: 600
              }}>Add New Assignment</h3>
              
              <button
                onClick={() => setShowInviteForm(!showInviteForm)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.25rem 0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {showInviteForm ? 'Cancel Invite' : '+ Invite New Person'}
              </button>
            </div>
            
            {showInviteForm && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.75rem'
                }}>Invite New Team Member</h4>
                
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '0.25rem'
                  }}>Email Address</label>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                      disabled={localIsLoading}
                    />
                    
                    <button
                      onClick={handleInviteNewMember}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: localIsLoading ? 0.7 : 1
                      }}
                      disabled={localIsLoading}
                    >
                      {localIsLoading ? (
                        <>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginRight: '0.5rem'
                          }}></div>
                          Sending...
                        </>
                      ) : 'Send Invite'}
                    </button>
                  </div>
                  
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.5rem'
                  }}>
                    This will send an invitation email and add the person to the team.
                  </p>
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.25rem'
              }}>Role</label>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select a role</option>
                <option value="reviewer">Technical Reviewer</option>
                <option value="consultant">External Consultant</option>
                <option value="stakeholder">Stakeholder</option>
                <option value="approver">Final Approver</option>
                <option value="custom">Custom Role...</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.25rem'
              }}>Team Member</label>
              <select 
                value={selectedTeamMember}
                onChange={(e) => setSelectedTeamMember(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select a team member</option>
                <option value="john">John Smith (Operations)</option>
                <option value="maria">Maria Rivas (Sustainability)</option>
                <option value="ahmed">Ahmed Hassan (Engineering)</option>
                <option value="emma">Emma Lee (Construction)</option>
                <option value="marcus">Marcus Johnson (Legal)</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.25rem'
              }}>Notification Preferences</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                  <input type="checkbox" style={{ marginRight: '0.5rem' }} defaultChecked />
                  Email notifications
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                <input type="checkbox" style={{ marginRight: '0.5rem' }} defaultChecked />
                  Task updates
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                  <input type="checkbox" style={{ marginRight: '0.5rem' }} />
                  Document changes
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{
          borderTop: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#3b82f6',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            Assign Role
          </button>
        </div>
      </div>
    </div>
  );
};

// History modal component
const HistoryModal = ({ permit, onClose }) => {
  if (!permit) return null;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        width: '91.666667%',
        maxWidth: '48rem',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 600
          }}>Permit History</h2>
          <button 
            onClick={onClose}
            style={{
              color: '#6b7280',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            overflow: 'hidden'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280'
                  }}>Date</th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280'
                  }}>User</th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280'
                  }}>Action</th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280'
                  }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {permit.history.map((entry, index) => (
                  <tr key={index}>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      borderBottom: index < permit.history.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      borderBottom: index < permit.history.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      {entry.user}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      borderBottom: index < permit.history.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      {entry.action}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      borderBottom: index < permit.history.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      {entry.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}>Add Note to History</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                placeholder="Add notes about changes, progress, or important context..."
                style={{
                  width: '100%',
                  height: '6rem',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  resize: 'vertical'
                }}
              ></textarea>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.375rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#3b82f6',
                cursor: 'pointer'
              }}>
                Add Note
              </button>
            </div>
          </div>
        </div>
        
        <div style={{
          borderTop: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              backgroundColor: 'white',
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

// Report modal component
const ReportModal = ({ workflow, onClose }) => {
  // Local state inside the component to satisfy React Hooks rules
  const [reportTab, setReportTab] = useState('preview');
  const [shareRecipients, setShareRecipients] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareFormat, setShareFormat] = useState('pdf');
  const [localIsLoading, setLocalIsLoading] = useState(false);
  
  if (!workflow) return null;
  
  const handleShareReport = async () => {
    const emails = shareRecipients.split(',').map(email => email.trim()).filter(email => email);
    
    if (emails.length === 0) {
      alert('Please enter at least one email address');
      return;
    }
    
    setLocalIsLoading(true);
    
    try {
      // Send invitations to all recipients
      const invitePromises = emails.map(email => 
        sendInvitation(email)
      );
      
      await Promise.all(invitePromises);
      displayToast(`Report shared with ${emails.length} recipient(s)`);
      
    } catch (error) {
      console.error('Error sharing report:', error);
      displayToast(`Failed to share report: ${error.message}`, 'error');
    } finally {
      setLocalIsLoading(false);
    }
  };
  
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
        borderRadius: "0.5rem",
        width: "91.666667%",
        maxWidth: "64rem",
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
          }}>{workflow.title} Report</h2>
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
        
        <div style={{ borderBottom: "1px solid #e0e0e0", display: "flex" }}>
          <button
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: reportTab === 'preview' ? '#2563eb' : '#6b7280',
              borderBottom: reportTab === 'preview' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setReportTab('preview')}
          >
            Preview
          </button>
          <button
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: reportTab === 'edit' ? '#2563eb' : '#6b7280',
              borderBottom: reportTab === 'edit' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setReportTab('edit')}
          >
            Edit
          </button>
          <button
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: reportTab === 'share' ? '#2563eb' : '#6b7280',
              borderBottom: reportTab === 'share' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setReportTab('share')}
          >
            Share
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: "auto" }}>
          {reportTab === 'preview' && (
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Energy Efficiency Directive Audit Report</h1>
              <p style={{ color: "#6b7280" }}>Generated on: {new Date().toLocaleDateString()}</p>
              
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "1.5rem" }}>1. Executive Summary</h2>
              <p>An energy audit was conducted at Data Center 1, a subsidiary of Data Center Group, in accordance with the UK's Energy Efficiency Directive (EED) audit requirements. The audit assessed energy consumption and identified opportunities for energy efficiency improvements.</p>
              
              {/* Additional preview content would go here */}
            </div>
          )}
          
          {reportTab === 'edit' && (
            <div style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.25rem"
                }}>Executive Summary</label>
                <textarea
                  style={{
                    width: "100%",
                    height: "8rem",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    resize: "vertical"
                  }}
                  defaultValue="An energy audit was conducted at Data Center 1, a subsidiary of Data Center Group, in accordance with the UK's Energy Efficiency Directive (EED) audit requirements. The audit assessed energy consumption and identified opportunities for energy efficiency improvements."
                ></textarea>
              </div>
              
              {/* Additional edit fields would go here */}
            </div>
          )}
          
          {reportTab === 'share' && (
            <div style={{ padding: "1.5rem" }}>
              <h3 style={{ 
                fontSize: "1.125rem", 
                fontWeight: 500, 
                marginBottom: "1rem" 
              }}>Share Report</h3>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}>Recipients</label>
                <input
                  type="text"
                  value={shareRecipients}
                  onChange={(e) => setShareRecipients(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem"
                  }}
                  placeholder="Enter email addresses separated by commas"
                  disabled={localIsLoading}
                />
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}>Message</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  style={{
                    width: "100%",
                    height: "6rem",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    resize: "vertical"
                  }}
                  placeholder="Add a message to the recipients"
                  disabled={localIsLoading}
                ></textarea>
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}>Format</label>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <label style={{ display: "inline-flex", alignItems: "center" }}>
                    <input 
                      type="radio" 
                      name="format" 
                      value="pdf"
                      checked={shareFormat === 'pdf'}
                      onChange={() => setShareFormat('pdf')}
                      style={{ marginRight: "0.5rem" }}
                    />
                    <span>PDF</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center" }}>
                    <input 
                      type="radio" 
                      name="format" 
                      value="docx"
                      checked={shareFormat === 'docx'}
                      onChange={() => setShareFormat('docx')}
                      style={{ marginRight: "0.5rem" }}
                    />
                    <span>DOCX</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center" }}>
                    <input 
                      type="radio" 
                      name="format" 
                      value="html"
                      checked={shareFormat === 'html'}
                      onChange={() => setShareFormat('html')}
                      style={{ marginRight: "0.5rem" }}
                    />
                    <span>HTML</span>
                  </label>
                </div>
              </div>
              
              <div>
                <button
                  onClick={handleShareReport}
                  disabled={localIsLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "0.375rem",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "white",
                    backgroundColor: "#3b82f6",
                    cursor: "pointer",
                    opacity: localIsLoading ? 0.7 : 1
                  }}
                >
                  {localIsLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '0.5rem'
                      }}></div>
                      Sharing...
                    </>
                  ) : 'Share Report'}
                </button>
              </div>
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
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

// Main return - what shows on the page
return (
  <div style={{
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 1rem"
  }}>
    {/* Toast notification for invitation results */}
    {showToast && (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '4px',
        backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
        color: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        zIndex: 9999,
        animation: 'fadeIn 0.3s ease',
      }}>
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
        {toastMessage}
      </div>
    )}
    
    {/* Global loading indicator */}
    {isLoading && (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '4px',
        backgroundColor: '#3b82f6',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        zIndex: 9999
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTop: '2px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '8px'
        }}></div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        Processing...
      </div>
    )}
    
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1.5rem"
    }}>
      <h1 style={{
        fontSize: "1.5rem",
        fontWeight: 700,
        color: "#111827"
      }}>Workflows</h1>
      
      <div style={{
        display: "flex",
        gap: "0.75rem"
      }}>
        <button style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.5rem 1rem",
          border: "1px solid #d1d5db",
          borderRadius: "0.375rem",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "#374151",
          backgroundColor: "white",
          cursor: "pointer"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ height: "1rem", width: "1rem", marginRight: "0.5rem" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
        </button>
        
        <button style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.5rem 1rem",
          border: "none",
          borderRadius: "0.375rem",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "white",
          backgroundColor: "#3b82f6",
          cursor: "pointer"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ height: "1rem", width: "1rem", marginRight: "0.5rem" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Workflow
        </button>
      </div>
    </div>

    {/* Online Users Avatar Stack - Added from Liveblocks integration */}
    <div className="online-users-container" style={{
      display: "flex",
      alignItems: "center",
      marginBottom: "20px"
    }}>
      <span style={{ marginRight: "10px", fontSize: "14px", color: "#666" }}>
        Online now:
      </span>
      <div className="avatar-stack" style={{ display: "flex" }}>
        {/* Current user avatar from Auth0 */}
        {user && (
          <div 
            className="user-avatar current-user"
            title={`${user.name || user.email} (you)`}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#2196f3",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "-8px",
              border: "2px solid white",
              zIndex: "2",
              position: "relative"
            }}
          >
            {(user.name || user.email || "You").charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Other users' avatars - Direct from Liveblocks */}
        {Array.isArray(onlineUsers) && onlineUsers.length > 0 ? (
          onlineUsers.map((otherUser, index) => (
            <div 
              key={otherUser.id || index}
              className="user-avatar"
              title={otherUser.name || otherUser.email || "Anonymous"}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#4caf50",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "-8px",
                border: "2px solid white",
                zIndex: 1,
                position: "relative"
              }}
            >
              {(otherUser.name || otherUser.email || "?").charAt(0).toUpperCase()}
            </div>
          ))
        ) : (
          <span style={{ fontSize: "14px", color: "#999" }}>No one else is online</span>
        )}
      </div>
    </div>

    {/* Main section tabs - Data Center Lifecycle Phases */}
    <div style={{
      display: "flex",
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "1.5rem",
      overflowX: "auto"
    }}>
      {/* Plan Tab */}
      <button
        onClick={() => setMainSection('plan')}
        style={{
          padding: "0.5rem 1rem",
          fontWeight: 500,
          fontSize: "0.875rem",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: mainSection === 'plan' ? "2px solid #dc2626" : "2px solid transparent",
          color: mainSection === 'plan' ? "#dc2626" : "#6b7280",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          position: "relative"
        }}
      >
        1. Plan / Feasibility
        <div
          ref={planInfoRef}
          onMouseEnter={() => setHoveredTab('plan')}
          onMouseLeave={() => setHoveredTab(null)}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#dc2626",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "help",
            position: "relative"
          }}
        >
          i
        </div>
        <InfoTooltip anchorRef={planInfoRef} visible={hoveredTab === 'plan'}>
          Strategic planning, site selection, business requirements, and financial feasibility. This phase establishes the foundation for the entire data center lifecycle.
        </InfoTooltip>
      </button>
      {/* Design Tab */}
      <button
        onClick={() => setMainSection('design')}
        style={{
          padding: "0.5rem 1rem",
          fontWeight: 500,
          fontSize: "0.875rem",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: mainSection === 'design' ? "2px solid #7c3aed" : "2px solid transparent",
          color: mainSection === 'design' ? "#7c3aed" : "#6b7280",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          position: "relative"
        }}
      >
        2. Design / Engineering
        <div
          ref={designInfoRef}
          onMouseEnter={() => setHoveredTab('design')}
          onMouseLeave={() => setHoveredTab(null)}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#7c3aed",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "help",
            position: "relative"
          }}
        >
          i
        </div>
        <InfoTooltip anchorRef={designInfoRef} visible={hoveredTab === 'design'}>
          Architectural, mechanical, electrical, and IT infrastructure design with focus on reliability, security, and efficiency.
        </InfoTooltip>
      </button>
      {/* Build Tab */}
      <button
        onClick={() => setMainSection('build')}
        style={{
          padding: "0.5rem 1rem",
          fontWeight: 500,
          fontSize: "0.875rem",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: mainSection === 'build' ? "2px solid #ea580c" : "2px solid transparent",
          color: mainSection === 'build' ? "#ea580c" : "#6b7280",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          position: "relative"
        }}
      >
        3. Build / Commissioning
        <div
          ref={buildInfoRef}
          onMouseEnter={() => setHoveredTab('build')}
          onMouseLeave={() => setHoveredTab(null)}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#ea580c",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "help",
            position: "relative"
          }}
        >
          i
        </div>
        <InfoTooltip anchorRef={buildInfoRef} visible={hoveredTab === 'build'}>
          Construction management, equipment installation, testing, and comprehensive commissioning to validate all systems.
        </InfoTooltip>
      </button>
      {/* Operate Tab */}
      <button
        onClick={() => setMainSection('operate')}
        style={{
          padding: "0.5rem 1rem",
          fontWeight: 500,
          fontSize: "0.875rem",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: mainSection === 'operate' ? "2px solid #0ea5e9" : "2px solid transparent",
          color: mainSection === 'operate' ? "#0ea5e9" : "#6b7280",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          position: "relative"
        }}
      >
        4. Operate / Maintain
        <div
          ref={operateInfoRef}
          onMouseEnter={() => setHoveredTab('operate')}
          onMouseLeave={() => setHoveredTab(null)}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#0ea5e9",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "help",
            position: "relative"
          }}
        >
          i
        </div>
        <InfoTooltip anchorRef={operateInfoRef} visible={hoveredTab === 'operate'}>
          24/7 monitoring, preventive maintenance, incident management, and environmental management for continuous availability.
        </InfoTooltip>
      </button>
      {/* Optimize Tab */}
      <button
        onClick={() => setMainSection('optimize')}
        style={{
          padding: "0.5rem 1rem",
          fontWeight: 500,
          fontSize: "0.875rem",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: mainSection === 'optimize' ? "2px solid #10b981" : "2px solid transparent",
          color: mainSection === 'optimize' ? "#10b981" : "#6b7280",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          position: "relative"
        }}
      >
        5. Optimize / Audit
        <div
          ref={optimizeInfoRef}
          onMouseEnter={() => setHoveredTab('optimize')}
          onMouseLeave={() => setHoveredTab(null)}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#10b981",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "help",
            position: "relative"
          }}
        >
          i
        </div>
        <InfoTooltip anchorRef={optimizeInfoRef} visible={hoveredTab === 'optimize'}>
          Performance analysis, energy audits, efficiency upgrades, and environmental permit management for continuous improvement.
        </InfoTooltip>
      </button>
      {/* Decommission Tab */}
      <button
        onClick={() => setMainSection('decommission')}
        style={{
          padding: "0.5rem 1rem",
          fontWeight: 500,
          fontSize: "0.875rem",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: mainSection === 'decommission' ? "2px solid #6b7280" : "2px solid transparent",
          color: mainSection === 'decommission' ? "#6b7280" : "#6b7280",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          position: "relative"
        }}
      >
        6. Decommission
        <div
          ref={decommissionInfoRef}
          onMouseEnter={() => setHoveredTab('decommission')}
          onMouseLeave={() => setHoveredTab(null)}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#6b7280",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "help",
            position: "relative"
          }}
        >
          i
        </div>
        <InfoTooltip anchorRef={decommissionInfoRef} visible={hoveredTab === 'decommission'}>
          Systematic shutdown, equipment removal, secure data destruction, and sustainable disposal with WEEE compliance.
        </InfoTooltip>
      </button>
    </div>
    {/* Phase 1: Plan / Feasibility */}
    {mainSection === 'plan' && (
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#dc2626", marginBottom: "1.5rem" }}>
          Phase 1: Plan / Feasibility - Strategic Foundation
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "1.5rem" }}>
          <WorkflowCard key="taxonomy" workflow={complianceFrameworks.find(w => w.id === 'taxonomy')} category="plan" />
        </div>
        {/* Environmental Permits Section */}
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937", marginBottom: "1.5rem" }}>
            Environmental Permit
          </h3>
          {/* Permit tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "1.5rem" }}>
            <button onClick={() => setEnvironmentalActiveTab('active')} 
                    style={{
                      padding: "0.5rem 1rem",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      backgroundColor: "transparent",
                      border: "none",
                      borderBottom: environmentalActiveTab === 'active' ? "2px solid #dc2626" : "2px solid transparent",
                      color: environmentalActiveTab === 'active' ? "#dc2626" : "#6b7280",
                      cursor: "pointer"
                    }}>
              Active Permits ({permits.active.length})
            </button>
            <button onClick={() => setEnvironmentalActiveTab('renewal')} 
                    style={{
                      padding: "0.5rem 1rem",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      backgroundColor: "transparent",
                      border: "none",
                      borderBottom: environmentalActiveTab === 'renewal' ? "2px solid #dc2626" : "2px solid transparent",
                      color: environmentalActiveTab === 'renewal' ? "#dc2626" : "#6b7280",
                      cursor: "pointer"
                    }}>
              Renewal Required ({permits.renewal.length})
            </button>
            <button onClick={() => setEnvironmentalActiveTab('completed')} 
                    style={{
                      padding: "0.5rem 1rem",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      backgroundColor: "transparent",
                      border: "none",
                      borderBottom: environmentalActiveTab === 'completed' ? "2px solid #dc2626" : "2px solid transparent",
                      color: environmentalActiveTab === 'completed' ? "#dc2626" : "#6b7280",
                      cursor: "pointer"
                    }}>
              Completed ({permits.completed.length})
            </button>
          </div>
          {/* Permit cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "1.5rem" }}>
            {permits[environmentalActiveTab].map(permit => (
              <PermitCard key={permit.id} permit={permit} />
            ))}
          </div>
        </div>
      </section>
    )}
    {/* Phase 2: Design / Engineering */}
    {mainSection === 'design' && (
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#7c3aed", marginBottom: "1.5rem" }}>
          Phase 2: Design / Engineering - Technical Architecture
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "1.5rem" }}>
          <WorkflowCard key="iso27001" workflow={isoStandards.find(w => w.id === 'iso27001')} category="design" />
        </div>
      </section>
    )}
    {/* Phase 3: Build / Commissioning */}
    {mainSection === 'build' && (
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#ea580c", marginBottom: "1.5rem" }}>
          Phase 3: Build / Commissioning - Construction & Validation
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "1.5rem" }}>
          <WorkflowCard key="iso9001" workflow={isoStandards.find(w => w.id === 'iso9001')} category="build" />
        </div>
      </section>
    )}
    {/* Phase 4: Operate / Maintain */}
    {mainSection === 'operate' && (
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0ea5e9", marginBottom: "1.5rem" }}>
          Phase 4: Operate / Maintain - Live Operations
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "1.5rem" }}>
          <WorkflowCard key="iso14001" workflow={isoStandards.find(w => w.id === 'iso14001')} category="operate" />
          <WorkflowCard key="coc" workflow={complianceFrameworks.find(w => w.id === 'coc')} category="operate" />
        </div>
      </section>
    )}
    {/* Phase 5: Optimize / Audit */}
    {mainSection === 'optimize' && (
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#10b981", marginBottom: "1.5rem" }}>
          Phase 5: Optimize / Audit - Performance Enhancement
        </h2>
        <div style={{ textAlign: "center", padding: "2rem", color: "#10b981" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
          <h3>Optimization Workflows</h3>
          <p>Performance analysis, energy audits, and efficiency upgrades coming soon.</p>
        </div>
      </section>
    )}
    {/* Phase 6: Decommission */}
    {mainSection === 'decommission' && (
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#6b7280", marginBottom: "1.5rem" }}>
          Phase 6: Decommission - End-of-Life Management
        </h2>
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏗️</div>
          <h3>Decommissioning Workflows</h3>
          <p>WEEE Directive compliance, secure data destruction workflows coming soon.</p>
        </div>
      </section>
    )}
    
    {/* Modals */}
    {showDetailsModal && (
      <WorkflowDetailsModal 
        workflow={currentWorkflow}
        onClose={handleCloseModals}
      />
    )}
    
    {/* Updated DocumentUploadModal with FileUploadService integration */}
    {showDocumentModal && (
      <DocumentUploadModal 
        workflow={currentWorkflow}
        onClose={handleCloseModals}
        onUploadComplete={handleUploadComplete}
      />
    )}
    
    {showReportModal && (
      <ReportModal 
        workflow={currentWorkflow}
        onClose={handleCloseModals}
      />
    )}

    {showPermitDetails && (
      <PermitDetailsModal 
        permit={selectedPermit}
        onClose={handleCloseModals}
      />
    )}
    
    {showAssignModal && (
      <AssignRolesModal 
        permit={selectedPermit}
        onClose={handleCloseModals}
      />
    )}
    
    {showHistoryModal && (
      <HistoryModal 
        permit={selectedPermit}
        onClose={handleCloseModals}
      />
    )}
    
    {/* Responsive styles */}
    <style>
      {`
        @media (min-width: 640px) {
          div[style*="grid-template-columns: repeat(1, 1fr)"] {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1024px) {
          div[style*="grid-template-columns: repeat(1, 1fr)"] {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}
    </style>
  </div>
);
};

export default WorkflowsPage;