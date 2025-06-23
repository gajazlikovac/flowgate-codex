// ComplianceChat.js - Enhanced version with guided questions and Mem0 integration
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import geminiService from '../services/GeminiService'; // Keep the existing import path
import fileUploadService from '../services/FileUploadService'; // Keep the existing import path
import FileUploadButton from './ui/FileUploadButton'; // Keep the existing import path
import FilePreview from './ui/FilePreview'; // Keep the existing import path
import debugUtils from './utils/DebuggingUtils'; // Keep the existing import path

// Welcome message for new conversations - simpler with no bullets
const WELCOME_MESSAGE = `Welcome to VAL: Ask me anything about data center compliance.`;

// Updated system prompt with comprehensive data center compliance and sustainability focus
const SYSTEM_PROMPT = `You are Val, a specialized compliance and sustainability assistant for data centers:

EXPERTISE DOMAINS:
- EU Taxonomy requirements for data centers
- Energy Efficiency Directive (EED) implementation
- EU Code of Conduct for Data Centers
- ISO Standards (9001, 14001, 27001, 50001)
- Data Center KPI series (ISO/IEC 30134 series)
- SIST-EN standards for data center facilities
- PUE, WUE, CUE and other data center efficiency metrics 
- Sustainability reporting and carbon accounting

KNOWLEDGE BASE APPROACH:
1. First provide precise facts from the knowledge graph about standards, requirements, and compliance obligations
2. Connect multiple standards when they overlap (e.g., "This EED requirement aligns with ISO 50001 section 4.6")
3. Provide practical implementation guidance based on industry best practices
4. Explain how compliance activities contribute to broader sustainability goals
5. Reference specific articles, sections and clauses from relevant standards

RESPONSE STRUCTURE:
1. Begin with concise summary of applicable requirements (1-2 sentences)
2. List key compliance requirements with exact values from standards
3. Explain relationships between different standards and requirements
4. Provide practical implementation guidance
5. Include specific references with standard name, year, and section/clause

WORKFLOW ASSISTANCE:
1. Help with compliance documentation workflow based on organizational processes
2. Assist with assessment preparation against specific standards
3. Guide through step-by-step compliance verification activities
4. Support completion of conformity questionnaires
5. Explain implementation of environmental management systems specific to data centers

FORMATTING GUIDELINES:
1. Provide concise, accurate information with responses around 200 words
2. Use bullet points for key compliance requirements (maximum 6)
3. ALWAYS include references at the end using format: "*References: [Standard Name] [Year], [Section/Article] - [Specific requirement]*"
4. Bold important terms, metrics, and thresholds
5. Keep explanations focused on practical implementation within data centers
6. When quoting numerical requirements (like PUE targets), preserve exact values from standards`;

// Guided questions for quick user access
const guidedQuestions = {
  "Data Center Efficiency": [
    "What are the key PUE targets for data centers under EU regulations?",
    "How can I improve cooling efficiency in my data center?",
    "What energy efficiency metrics should I be tracking for compliance?"
  ],
  "EU Taxonomy": [
    "What disclosure requirements does the EU Taxonomy create for data centers?",
    "How do I determine if my data center is Taxonomy-aligned?",
    "What are the Technical Screening Criteria for data centers?"
  ],
  "Compliance Documentation": [
    "What documentation is required for EED compliance?",
    "How often do we need to conduct energy audits?",
    "What should be included in our annual sustainability report?"
  ],
  "ISO Standards": [
    "Which ISO standards are most relevant for data center operators?",
    "What's the difference between ISO 50001 and 14001 for data centers?",
    "What steps are needed to achieve ISO 27001 certification?"
  ]
};

const ComplianceChat = () => {
  // User ID management for Mem0 memory
  const [userId, setUserId] = useState(() => {
    // Generate or retrieve a persistent user ID
    const storedId = localStorage.getItem('compliance_chat_user_id');
    if (storedId) return storedId;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('compliance_chat_user_id', newId);
    return newId;
  });
  
  // State management
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState('New Conversation');
  const [conversations, setConversations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState(false);
  
  // Add new state for file uploads
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // New state for guided questions section
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  // Reference for auto-scrolling messages
  const messagesEndRef = useRef(null);

  // Initialize the Gemini API service
  useEffect(() => {
    const initAPI = async () => {
      try {
        // Test API connection using debug utilities
        const connectionTest = await debugUtils.testApiConnection(geminiService);
        console.log("Initial API connection test:", connectionTest);
        
        // Initialize the API service
        const success = await geminiService.initialize();
        setApiAvailable(success);
        console.log("API available:", success);
        
        // Check if memory is available
        setMemoryStatus(geminiService.isMemoryAvailable());
        console.log("Memory available:", geminiService.isMemoryAvailable());
        
        if (!success && process.env.NODE_ENV === 'development') {
          console.warn("API connection failed. Check if your API key is correctly set in the .env file.");
        }
      } catch (error) {
        console.error("Error during API initialization:", error);
        setApiAvailable(false);
      }
    };
    
    initAPI();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations from localStorage on init
  useEffect(() => {
    const loadedConversations = localStorage.getItem('clearDecisions_conversations');
    if (loadedConversations) {
      setConversations(JSON.parse(loadedConversations));
    }
  }, []);

  // Test the API connection (can be triggered by user or debugging)
  const testApiConnection = async () => {
    setIsLoading(true);
    try {
      const result = await debugUtils.testApiConnection(geminiService);
      console.log("API Connection Test Results:", result);
      setApiAvailable(result.success);
      
      // Show a message to the user
      const newMessage = { 
        text: result.success 
          ? "✅ API connection successful! I'm ready to assist you."
          : `❌ API connection issue: ${result.error}\n\nPlease check your API key configuration.`,
        sender: 'assistant' 
      };
      
      setMessages(prevMessages => [...prevMessages, newMessage]);
    } catch (error) {
      console.error("Error testing API connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset user memory
  const resetUserMemory = async () => {
    if (geminiService.isMemoryAvailable()) {
      setIsLoading(true);
      try {
        await geminiService.resetUserMemory(userId);
        // Add a system message to indicate memory was reset
        setMessages(prev => [...prev, { 
          text: "Memory has been reset. The assistant will not remember previous conversations.",
          sender: 'system'
        }]);
      } catch (error) {
        console.error("Error resetting memory:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle conversation selection
  const selectConversation = (conversationName) => {
    setSelectedConversation(conversationName);
    
    // Load messages for the selected conversation
    const savedMessages = localStorage.getItem(`clearDecisions_conversation_${conversationName}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([]);
    }
  };

  // Create a new chat
  const createNewChat = () => {
    setMessages([]);
    setSelectedConversation('New Conversation');
  };

  // Handle file selection
  const handleFileSelect = async (file) => {
    try {
      const processedFile = await fileUploadService.processFile(file);
      setSelectedFiles(prev => [...prev, processedFile]);
    } catch (error) {
      console.error("Error handling file upload:", error);
      alert(`Error uploading file: ${error.message}`);
    }
  };

  // Remove a file from the selected files
  const handleRemoveFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Toggle expand/collapse of guided question categories
  const toggleCategory = (category) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  // Select a guided question
  const selectGuidedQuestion = (question) => {
    setCurrentMessage(question);
    // Optional: auto-send the question
    // handleSendMessage(question);
  };

  // Generate assistant response
  const generateResponse = async (userMessage, files = []) => {
    // Log the API request for debugging
    const requestId = debugUtils.logApiRequest('generate-content', {
      message: userMessage,
      files: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
    });
    
    try {
      if (!apiAvailable) {
        throw new Error("API not available");
      }
      
      // If there are no files, use regular text generation
      if (!files || files.length === 0) {
        const prompt = `${SYSTEM_PROMPT}\n\nUser: ${userMessage}`;
        const response = await geminiService.generateContent(prompt, true, userId);
        
        // Log the successful response
        debugUtils.updateApiRequest(requestId, 'success', {
          responseLength: response.length,
          responsePreview: response.substring(0, 100) + '...'
        });
        
        return response;
      }
      
      // Otherwise, prepare file data for the multimodal API
      const fileDataPromises = files.map(async (file) => {
        const cachedFile = fileUploadService.getFile(file.id);
        if (!cachedFile) return null;
        
        return {
          data: cachedFile.content.split(',')[1], // Remove data:mimeType;base64, prefix
          mimeType: cachedFile.type
        };
      });
      
      // Filter out any null values (files that couldn't be processed)
      const fileData = (await Promise.all(fileDataPromises)).filter(f => f !== null);
      
      // Generate context about files to add to the prompt
      const fileNames = files.map(f => f.name).join(', ');
      
      // Create a prompt that includes information about the files
      const prompt = `${SYSTEM_PROMPT}\n\nThe user has uploaded the following files: ${fileNames}.\n\nUser question: ${userMessage}`;
      
      // Generate content with files
      const response = await geminiService.generateContentWithFiles(prompt, fileData, true, userId);
      
      // Log the successful response
      debugUtils.updateApiRequest(requestId, 'success', {
        responseLength: response.length,
        responsePreview: response.substring(0, 100) + '...'
      });
      
      return response;
    } catch (error) {
      // Log the error response
      debugUtils.updateApiRequest(requestId, 'error', {
        error: error.message,
        stack: error.stack
      });
      
      console.error("Error generating response:", error);
      
      // Fallback to the mock response if API call fails
      return fallbackResponse(userMessage);
    }
  };

  // Fallback response generator when API is unavailable
  const fallbackResponse = (userMessage) => {
    // Mock response based on keywords in the message
    let response = "I understand your question. As a compliance assistant, I would need to analyze specific regulations to provide a detailed answer.";
    
    if (userMessage.toLowerCase().includes('taxonomy')) {
      response = `## EU Taxonomy Information

The EU Taxonomy is a classification system for environmentally sustainable economic activities. For data centers, key requirements include:

- **PUE targets** below 1.4 for new facilities
- Minimum **25% renewable energy** usage (increasing over time)
- Compliance with **energy efficiency best practices**
- **Climate risk assessment** and adaptation measures
- Regular **environmental impact reporting**
- Implementation of **waste heat recovery** where feasible

*References: EU Regulation 2020/852, Technical Screening Criteria for Climate Change Mitigation (Delegated Act)*`;
    } else if (userMessage.toLowerCase().includes('eed') || userMessage.toLowerCase().includes('energy efficiency directive')) {
      response = `## Energy Efficiency Directive (EED)

Key requirements for data centers:

- **Energy audits** at least every 4 years
- **Energy management systems** implementation (ISO 50001)
- **Reporting** energy consumption data annually
- **Waste heat recovery** measures assessment
- **Energy efficiency improvements** of at least 1.5% annually
- **Documentation** of all energy efficiency measures

*References: Directive 2012/27/EU (as amended by Directive 2018/2002), Article 8 (energy audits), Article 14 (waste heat)*`;
    } else if (userMessage.toLowerCase().includes('code of conduct')) {
      response = `## EU Code of Conduct for Data Centers

This voluntary initiative focuses on energy efficiency improvement:

- **Minimum expected practices** for all participants
- **Optional best practices** for advanced efficiency
- Annual **reporting requirements** on energy metrics
- **PUE measurement** and improvement targets
- **Cooling efficiency** optimization guidelines
- **IT equipment** efficiency management

*References: EU JRC Code of Conduct for Energy Efficiency in Data Centres (v12.1.0), Best Practices Guidelines*`;
    } else if (userMessage.toLowerCase().includes('iso')) {
      response = `## Relevant ISO Standards for Data Centers

Key standards for compliance:

- **ISO 50001** - Energy management systems
- **ISO 14001** - Environmental management systems
- **ISO 27001** - Information security management
- **ISO 22301** - Business continuity management
- **ISO 9001** - Quality management systems
- **ISO 14064** - Greenhouse gas quantification

*References: ISO 50001:2018, ISO 14001:2015, ISO/IEC 27001:2022*`;
    } else if (selectedFiles && selectedFiles.length > 0) {
      response = `I can see you've uploaded ${selectedFiles.length} file(s), but I'm unable to analyze them without API connectivity. Please ensure your API key is correctly configured, or ask me a specific question about compliance requirements.`;
    }
    
    return response;
  };

  // Handle sending a message
  const handleSendMessage = async (overrideMessage = null) => {
    const messageToSend = overrideMessage || currentMessage;
    
    if (!messageToSend.trim() && selectedFiles.length === 0) return;
    
    // Get user message and add to chat
    const userMessage = messageToSend;
    const filesToSend = [...selectedFiles]; // Make a copy of the current files
    
    // Create a user message object that includes files if any
    const newUserMessage = { 
      text: userMessage, 
      sender: 'user',
      files: filesToSend.length > 0 ? filesToSend : undefined
    };
    
    // Update messages with user message only first
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setCurrentMessage('');
    setSelectedFiles([]); // Clear selected files after sending
    
    // Generate assistant response
    let response;
    setIsLoading(true);
    
    try {
      response = await generateResponse(userMessage, filesToSend);
    } catch (error) {
      console.error("Error in send message flow:", error);
      response = "Sorry, I encountered an error processing your request. Please try again.";
    } finally {
      setIsLoading(false);
    }
    
    // Create the assistant message and update state
    const newAssistantMessage = { text: response, sender: 'assistant' };
    
    // Use a callback to ensure we have the latest state
    setMessages(currentMessages => {
      const updatedMessages = [...currentMessages, newAssistantMessage];
      
      // Save conversation after state update
      const title = selectedConversation === 'New Conversation' 
        ? `Conversation about ${userMessage || 'uploaded files'}`
        : selectedConversation;
      
      // Save to localStorage
      localStorage.setItem(`clearDecisions_conversation_${title}`, JSON.stringify(updatedMessages));
      
      // Update conversations list if it's a new conversation
      if (selectedConversation === 'New Conversation') {
        const date = new Date().toISOString().split('T')[0];
        const updatedConversations = { ...conversations, [title]: date };
        setConversations(updatedConversations);
        setSelectedConversation(title);
        
        // Save updated conversation list
        localStorage.setItem('clearDecisions_conversations', JSON.stringify(updatedConversations));
      }
      
      return updatedMessages;
    });
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="compliance-chat" style={{ height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
      <div className="chat-container" style={{ 
        display: 'flex', 
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Enhanced Sidebar with Guided Questions */}
        <div className="sidebar" style={{ 
          width: '280px', // Slightly wider to accommodate guided questions
          flexShrink: 0,
          backgroundColor: 'var(--background-light)', 
          borderRight: '1px solid #e0e0e0',
          padding: '16px',
          paddingTop: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="chat-header" style={{ 
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              margin: 0, 
              display: 'flex', 
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{ 
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6e8efb, #a777e3)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Yellow lightning icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FFD700" />
                </svg>
              </div>
              DC Compliance
            </h2>
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '14px', 
              color: 'var(--text-secondary)'
            }}>
              Your Compliance Assistant
            </p>
            
            {/* API status indicator */}
            <div style={{ 
              marginTop: '10px', 
              padding: '6px',
              backgroundColor: apiAvailable ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              borderRadius: '4px',
              fontSize: '12px',
              color: apiAvailable ? '#4caf50' : '#f44336',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '16px' }}>{apiAvailable ? '✅' : '⚠️'}</span>
              <span>{apiAvailable ? 'API Connected' : 'API Not Connected'}</span>
            </div>
            
            {/* Memory status indicator */}
            {memoryStatus && (
              <div style={{ 
                marginTop: '6px', 
                padding: '6px',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#4caf50',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '16px' }}>🧠</span>
                <span>Memory Enabled</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={createNewChat}
            className="new-chat-button"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '4px',
              marginBottom: '24px',
              width: '100%',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            <span>New Chat</span>
          </button>
          
          {/* Memory reset button */}
          {memoryStatus && (
            <button 
              onClick={resetUserMemory}
              style={{
                marginBottom: '24px',
                padding: '8px 12px',
                backgroundColor: 'rgba(159, 141, 203, 0.1)',
                color: 'var(--primary-color)',
                border: '1px solid var(--primary-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🧠</span>
              <span>Reset Assistant Memory</span>
            </button>
          )}
          
          {/* New Guided Questions Section */}
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--text-secondary)' 
          }}>
            Guided Questions
          </h3>
          
          <div className="guided-questions" style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '24px'
          }}>
            {Object.entries(guidedQuestions).map(([category, questions]) => (
              <div key={category} className="question-category">
                <div 
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(159, 141, 203, 0.1)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  <span>{category}</span>
                  <span style={{ fontSize: '12px', transition: 'transform 0.2s' }}>
                    {expandedCategory === category ? '▼' : '▶'}
                  </span>
                </div>
                
                {expandedCategory === category && (
                  <div className="question-list" style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '6px 0 6px 12px',
                    margin: '4px 0'
                  }}>
                    {questions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => selectGuidedQuestion(question)}
                        style={{
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: 'var(--primary-color)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          ':hover': {
                            backgroundColor: 'rgba(159, 141, 203, 0.05)'
                          }
                        }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--text-secondary)' 
          }}>
            Previous Conversations
          </h3>
          
          <div className="conversation-list" style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto'
          }}>
            {Object.entries(conversations).map(([name, date]) => (
              <div 
                key={name}
                className={`conversation-item ${selectedConversation === name ? 'active' : ''}`}
                onClick={() => selectConversation(name)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedConversation === name 
                    ? 'rgba(159, 141, 203, 0.1)' 
                    : 'transparent',
                  borderLeft: selectedConversation === name 
                    ? '3px solid var(--primary-color)' 
                    : '3px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>{name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{date}</div>
              </div>
            ))}
          </div>
          
          {/* API Test Button (only visible in development) */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={testApiConnection}
              style={{
                marginTop: 'auto',
                padding: '8px 12px',
                backgroundColor: apiAvailable ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                color: apiAvailable ? '#4caf50' : '#f44336',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>{apiAvailable ? '✅' : '⚠️'}</span>
              <span>{apiAvailable ? 'Test API Connection' : 'Check API Status'}</span>
            </button>
          )}
        </div>
        
        {/* Main Chat Area */}
        <div className="main-chat-area" style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <div className="chat-header" style={{ 
            padding: '16px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontWeight: '500' }}>
              {selectedConversation}
            </div>
            
            {/* Memory status in header */}
            {memoryStatus && (
              <div style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginRight: '10px'
              }}>
                <span style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#4caf50',
                  display: 'inline-block'
                }}></span>
                <span>Memory Enabled</span>
              </div>
            )}
            
            {/* Info about concise responses */}
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(159, 141, 203, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>
                i
              </span>
              <span>Responses optimized for clarity (~200 words)</span>
            </div>
          </div>
          
          {/* Messages Area */}
          <div className="messages-area" style={{ 
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Simplified welcome screen when no messages */}
            {messages.length === 0 && (
              <div className="empty-state" style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '30px 20px',
                textAlign: 'center'
              }}>
                {/* Data center illustration */}
                <div style={{ marginBottom: '20px' }}>
                  {/* Yellow lightning icon */}
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                <div style={{ 
                  maxWidth: '600px', 
                  padding: '30px', 
                  backgroundColor: 'rgba(110, 142, 251, 0.05)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(110, 142, 251, 0.2)',
                  textAlign: 'center'
                }}>
                  <h2 style={{ marginTop: 0, marginBottom: '30px', fontSize: '24px', color: '#a777e3', fontWeight: '500' }}>
                    Welcome to VAL: Ask me anything about data center compliance.
                  </h2>
                  
                  {memoryStatus && (
                    <p style={{ fontSize: '16px', color: '#4caf50', marginBottom: '20px' }}>
                      🧠 Memory enabled - I'll remember our conversations
                    </p>
                  )}
                  
                  <div style={{ 
                    marginTop: '30px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '15px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => toggleCategory('Data Center Efficiency')}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #6e8efb, #a777e3)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      Data Center Efficiency →
                    </button>
                    <button
                      onClick={() => toggleCategory('EU Taxonomy')}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #6e8efb, #a777e3)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      EU Taxonomy →
                    </button>
                  </div>
                </div>
                
                {!apiAvailable && (
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '10px 16px', 
                    backgroundColor: 'rgba(244, 67, 54, 0.1)', 
                    borderRadius: '4px', 
                    color: '#f44336',
                    maxWidth: '500px',
                    width: '100%'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
                      ⚠️ Gemini API not connected. Using fallback responses.
                    </p>
                    <p style={{ fontSize: '14px', margin: 0 }}>
                      Check that your .env file contains REACT_APP_GEMINI_API_KEY.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Message bubbles with file attachments */}
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.sender}-message`}
                style={{
                  maxWidth: message.sender === 'system' ? '90%' : '75%',
                  alignSelf: message.sender === 'user' ? 'flex-end' : 
                            message.sender === 'system' ? 'center' : 'flex-start',
                  backgroundColor: message.sender === 'user' 
                    ? 'var(--primary-color)' 
                    : message.sender === 'system'
                      ? 'rgba(0,0,0,0.05)'
                      : 'var(--background-light)',
                  color: message.sender === 'user' 
                    ? 'white' 
                    : message.sender === 'system' 
                      ? '#666' 
                      : 'inherit',
                  padding: '12px 16px',
                  borderRadius: message.sender === 'system' ? '8px' : '12px',
                  borderBottomLeftRadius: message.sender === 'user' ? '12px' : message.sender === 'system' ? '8px' : '4px',
                  borderBottomRightRadius: message.sender === 'user' ? '4px' : message.sender === 'system' ? '8px' : '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  fontSize: message.sender === 'system' ? '13px' : 'inherit',
                  fontStyle: message.sender === 'system' ? 'italic' : 'normal'
                }}
              >
                {message.sender === 'assistant' ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="avatar" style={{ 
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6e8efb, #a777e3)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {/* Yellow lightning icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FFD700" />
                      </svg>
                    </div>
                    <div className="markdown-content">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                  </div>
                ) : message.sender === 'system' ? (
                  <div>{message.text}</div>
                ) : (
                  <div>
                    {/* User message content */}
                    <div>{message.text}</div>
                    
                    {/* File attachments if any */}
                    {message.files && message.files.length > 0 && (
                      <div className="message-files" style={{
                        marginTop: message.text ? '8px' : 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        {message.files.map(file => (
                          <div 
                            key={file.id} 
                            className="message-file" 
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              borderRadius: '8px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span style={{ fontSize: '14px' }}>
                              {file.type && file.type.includes('pdf') ? '📄' : 
                               file.type && file.type.includes('word') ? '📝' :
                               file.type && (file.type.includes('excel') || file.type.includes('csv')) ? '📊' :
                               file.type && file.type.includes('image') ? '🖼️' : '📎'}
                            </span>
                            <span style={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px'
                            }}>
                              {file.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="loading-indicator" style={{ 
                alignSelf: 'flex-start',
                backgroundColor: 'var(--background-light)',
                padding: '12px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                <div className="dot-flashing"></div>
                <span>Val is thinking...</span>
              </div>
            )}
            
            {/* Auto-scroll reference */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area with File Upload */}
          <div className="input-area" style={{ 
            padding: '16px',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* File preview area */}
            {selectedFiles.length > 0 && (
              <div className="file-previews" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px'
              }}>
                {selectedFiles.map(file => (
                  <FilePreview 
                    key={file.id} 
                    file={file} 
                    onRemove={handleRemoveFile} 
                  />
                ))}
              </div>
            )}
            
            {/* Input row with textarea, upload button and send button */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <FileUploadButton 
                onFileSelect={handleFileSelect}
                acceptedTypes=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.json,.jpg,.jpeg,.png,.gif"
                disabled={isLoading}
              />
              
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  resize: 'none',
                  minHeight: '44px',
                  maxHeight: '120px',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              />
              
              <button 
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!currentMessage.trim() && selectedFiles.length === 0)}
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  padding: '0 20px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (currentMessage.trim() || selectedFiles.length > 0) && !isLoading ? 'pointer' : 'not-allowed',
                  opacity: (currentMessage.trim() || selectedFiles.length > 0) && !isLoading ? 1 : 0.7,
                  fontWeight: '500'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading animation styles */}
      <style jsx>{`
        .dot-flashing {
          position: relative;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: var(--primary-color);
          color: var(--primary-color);
          animation: dot-flashing 1s infinite linear alternate;
          animation-delay: 0.5s;
        }
        .dot-flashing::before, .dot-flashing::after {
          content: '';
          display: inline-block;
          position: absolute;
          top: 0;
        }
        .dot-flashing::before {
          left: -15px;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: var(--primary-color);
          color: var(--primary-color);
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 0s;
        }
        .dot-flashing::after {
          left: 15px;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: var(--primary-color);
          color: var(--primary-color);
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 1s;
        }
        @keyframes dot-flashing {
          0% {
            background-color: var(--primary-color);
          }
          50%, 100% {
            background-color: rgba(159, 141, 203, 0.2);
          }
        }
        
        .markdown-content h2 {
          font-size: 1.4rem;
          margin-top: 0.5rem;
          margin-bottom: 1rem;
          color: var(--primary-dark);
        }
        
        .markdown-content h3 {
          font-size: 1.2rem;
          margin-top: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content p {
          margin: 0.5rem 0;
        }
        
        .markdown-content ul {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        
        .markdown-content code {
          background: rgba(0,0,0,0.05);
          padding: 0.1rem 0.2rem;
          border-radius: 3px;
          font-size: 0.9em;
        }
        
        .markdown-content strong {
          color: var(--primary-dark);
        }
        
        .markdown-content em {
          display: block;
          font-size: 0.9em;
          border-top: 1px solid #eee;
          margin-top: 1em;
          padding-top: 0.5em;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default ComplianceChat;