// ChatWidget.js - Enhanced with memory functionality
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatContext } from '../utils/ChatContext'; // Keep the existing import path
import FileUploadButton from './FileUploadButton'; // Keep the existing import path
import FilePreview from './FilePreview'; // Keep the existing import path

const ChatWidget = () => {
  // Get values and functions from context
  const { 
    messages, 
    isLoading, 
    apiAvailable,
    memoryAvailable,
    isWidgetOpen, 
    sendMessage, 
    resetMemory,
    setIsWidgetOpen,
    setLastInteraction,
    pageContext,
    userId
  } = useChatContext();

  // Local state
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isWidgetOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isWidgetOpen]);

  // Auto-focus input when widget opens
  useEffect(() => {
    if (isWidgetOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
      }, 300);
    }
  }, [isWidgetOpen]);

  // Handle file selection
  const handleFileSelect = async (file) => {
    try {
      // Record interaction
      setLastInteraction(Date.now());
      
      const processedFile = await window.fileUploadService.processFile(file);
      setSelectedFiles(prev => [...prev, processedFile]);
    } catch (error) {
      console.error("Error handling file upload:", error);
      alert(`Error uploading file: ${error.message}`);
    }
  };

  // Remove a file from selection
  const handleRemoveFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
    setLastInteraction(Date.now());
  };

  // Send message
  const handleSendMessage = async () => {
    if ((!inputText || !inputText.trim()) && selectedFiles.length === 0) return;
    
    // Record interaction
    setLastInteraction(Date.now());
    
    // Get text and files
    const text = inputText;
    const files = [...selectedFiles];
    
    // Clear input and files
    setInputText('');
    setSelectedFiles([]);
    
    // Send message via context
    await sendMessage(text, files);
  };

  // Reset memory
  const handleResetMemory = async () => {
    setLastInteraction(Date.now());
    await resetMemory();
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle widget open/closed
  const toggleWidget = () => {
    setIsWidgetOpen(prev => !prev);
    setLastInteraction(Date.now());
  };

  // Format the page context for display
  const getContextDisplay = () => {
    if (!pageContext) return null;
    
    return (
      <div className="page-context" style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: '8px'
      }}>
        <span style={{ fontWeight: 'bold' }}>Context:</span> {pageContext.pageName}
      </div>
    );
  };

  return (
    <div className="chat-widget" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end'
    }}>
      {/* Collapsed button when widget is closed */}
      {!isWidgetOpen && (
        <button 
          onClick={toggleWidget}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            fontSize: '24px'
          }}
        >
          <span>💬</span>
        </button>
      )}
      
      {/* Expanded widget */}
      {isWidgetOpen && (
        <div className="widget-container" style={{
          width: '350px',
          height: '500px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Widget header */}
          <div className="widget-header" style={{
            padding: '12px 16px',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'white',
                color: 'var(--primary-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                V
              </div>
              <div style={{ fontWeight: '500' }}>Val Assistant</div>
              
              {/* Memory status indicator */}
              {memoryAvailable && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  marginLeft: '6px'
                }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: '#4caf50',
                    display: 'inline-block'
                  }}></span>
                  <span>Memory</span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Memory reset button */}
              {memoryAvailable && (
                <button
                  onClick={handleResetMemory}
                  title="Reset conversation memory"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    opacity: '0.8'
                  }}
                >
                  🧠
                </button>
              )}
              
              {/* Close button */}
              <button 
                onClick={toggleWidget}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px'
                }}
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Widget messages */}
          <div className="widget-messages" style={{
            flex: 1,
            padding: '12px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Page context display */}
            {getContextDisplay()}
            
            {/* No messages state */}
            {messages.length === 0 && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                <p>Ask me anything about compliance!</p>
                {!apiAvailable && (
                  <p style={{
                    color: '#f44336',
                    fontSize: '12px',
                    marginTop: '8px'
                  }}>
                    ⚠️ API not connected. Limited functionality available.
                  </p>
                )}
                {memoryAvailable && (
                  <p style={{
                    color: '#4caf50',
                    fontSize: '12px',
                    marginTop: '8px'
                  }}>
                    🧠 Memory enabled. I'll remember our conversation.
                  </p>
                )}
              </div>
            )}
            
            {/* Message bubbles */}
            {messages.map((message, index) => (
              <div 
                key={index}
                style={{
                  alignSelf: message.sender === 'user' ? 'flex-end' : 
                           message.sender === 'system' ? 'center' : 'flex-start',
                  maxWidth: message.sender === 'system' ? '90%' : '80%',
                  backgroundColor: message.sender === 'user' 
                    ? 'var(--primary-color)' 
                    : message.sender === 'system'
                      ? 'rgba(0,0,0,0.05)'
                      : message.isError
                        ? 'rgba(244, 67, 54, 0.1)'
                        : 'var(--background-light)',
                  color: message.sender === 'user' ? 'white' : 
                         message.sender === 'system' ? '#666' : 'inherit',
                  padding: '8px 12px',
                  borderRadius: message.sender === 'system' ? '8px' : '12px',
                  borderBottomLeftRadius: message.sender === 'user' ? '12px' : message.sender === 'system' ? '8px' : '4px',
                  borderBottomRightRadius: message.sender === 'user' ? '4px' : message.sender === 'system' ? '8px' : '12px',
                  fontSize: message.sender === 'system' ? '12px' : '14px',
                  fontStyle: message.sender === 'system' ? 'italic' : 'normal'
                }}
              >
                {message.sender === 'assistant' ? (
                  <div className="markdown-content" style={{ fontSize: '14px' }}>
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  </div>
                ) : message.sender === 'system' ? (
                  <div>{message.text}</div>
                ) : (
                  <div>
                    <div style={{ fontSize: '14px' }}>{message.text}</div>
                    
                    {/* File attachments */}
                    {message.files && message.files.length > 0 && (
                      <div style={{
                        marginTop: message.text ? '4px' : 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        {message.files.map(file => (
                          <div 
                            key={file.id}
                            style={{
                              fontSize: '12px',
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {file.type && file.type.includes('pdf') ? '📄' : 
                             file.type && file.type.includes('word') ? '📝' :
                             file.type && (file.type.includes('excel') || file.type.includes('csv')) ? '📊' :
                             file.type && file.type.includes('image') ? '🖼️' : '📎'}
                            <span style={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
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
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: 'var(--background-light)',
                padding: '8px 12px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>Val is thinking...</span>
              </div>
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* File previews */}
          {selectedFiles.length > 0 && (
            <div style={{
              padding: '0 12px',
              maxHeight: '100px',
              overflowY: 'auto',
              borderTop: '1px solid rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                padding: '8px 0'
              }}>
                {selectedFiles.map(file => (
                  <FilePreview 
                    key={file.id}
                    file={file}
                    onRemove={handleRemoveFile}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Widget input */}
          <div className="widget-input" style={{
            padding: '12px',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '8px'
          }}>
            <FileUploadButton
              onFileSelect={handleFileSelect}
              acceptedTypes=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
              disabled={isLoading}
            />
            
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setLastInteraction(Date.now());
              }}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything..."
              style={{
                flex: 1,
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '8px 12px',
                resize: 'none',
                fontSize: '14px',
                minHeight: '36px',
                maxHeight: '80px'
              }}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputText.trim() && selectedFiles.length === 0)}
              style={{
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (inputText.trim() || selectedFiles.length > 0) && !isLoading ? 'pointer' : 'not-allowed',
                opacity: (inputText.trim() || selectedFiles.length > 0) && !isLoading ? 1 : 0.5
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
      
      {/* Typing indicator animation */}
      <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          margin: 0 1px;
          background-color: #9E9EA1;
          display: block;
          border-radius: 50%;
          opacity: 0.4;
        }
        
        .typing-indicator span:nth-of-type(1) {
          animation: 1s blink infinite 0.3333s;
        }
        
        .typing-indicator span:nth-of-type(2) {
          animation: 1s blink infinite 0.6666s;
        }
        
        .typing-indicator span:nth-of-type(3) {
          animation: 1s blink infinite 0.9999s;
        }
        
        @keyframes blink {
          50% {
            opacity: 1;
          }
        }
        
        .markdown-content p {
          margin: 0.25rem 0;
        }
        
        .markdown-content ul {
          padding-left: 1.2rem;
          margin: 0.25rem 0;
        }
        
        .markdown-content h2 {
          font-size: 1.1rem;
          margin: 0.5rem 0 0.25rem;
        }
        
        .markdown-content h3 {
          font-size: 1rem;
          margin: 0.5rem 0 0.25rem;
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;