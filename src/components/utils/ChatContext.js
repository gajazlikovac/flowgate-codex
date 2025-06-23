// ChatContext.js - Enhanced with Mem0 memory integration
import React, { createContext, useState, useContext, useEffect } from 'react';
import geminiService from '../../services/GeminiService'; // Keep the existing import path
import fileUploadService from '../../services/FileUploadService';

// Create the chat context
const ChatContext = createContext();

// Custom hook for using the chat context
export const useChatContext = () => useContext(ChatContext);

// Provider component that wraps your app and makes chat context available
export const ChatProvider = ({ children }) => {
  // User ID management for memory persistence
  const [userId, setUserId] = useState(() => {
    // Generate or retrieve a persistent user ID
    const storedId = localStorage.getItem('compliance_chat_user_id');
    if (storedId) return storedId;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('compliance_chat_user_id', newId);
    return newId;
  });
  
  // Shared state for both chat components
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [memoryAvailable, setMemoryAvailable] = useState(false);
  const [pageContext, setPageContext] = useState(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  // System prompt that includes page context when available
  const getSystemPrompt = () => {
    const basePrompt = `You are Val, a compliance assistant specialized in:
- EU Taxonomy requirements
- Energy Efficiency Directive (EED)
- EU Code of Conduct
- ISO Standards
- Data Center compliance

Provide concise, accurate information and cite relevant regulations when appropriate.`;

    if (pageContext) {
      return `${basePrompt}

Current page context: The user is currently on the ${pageContext.pageName} page. 
${pageContext.additionalContext || ''}`;
    }

    return basePrompt;
  };

  // Initialize API on component mount
  useEffect(() => {
    const initializeApi = async () => {
      try {
        const success = await geminiService.initialize();
        setApiAvailable(success);
        console.log("API initialized:", success);
        
        // Check memory availability
        setMemoryAvailable(geminiService.isMemoryAvailable());
        console.log("Memory available:", geminiService.isMemoryAvailable());
      } catch (error) {
        console.error("Error initializing API:", error);
        setApiAvailable(false);
      }
    };

    initializeApi();
  }, []);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('clearDecisions_global_chat');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error("Error parsing saved messages:", error);
      }
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('clearDecisions_global_chat', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-close widget after period of inactivity (5 minutes)
  useEffect(() => {
    const inactivityTimeout = 5 * 60 * 1000; // 5 minutes
    
    if (!isWidgetOpen) return;
    
    const timer = setTimeout(() => {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
      if (timeSinceLastInteraction > inactivityTimeout) {
        setIsWidgetOpen(false);
      }
    }, inactivityTimeout);
    
    return () => clearTimeout(timer);
  }, [isWidgetOpen, lastInteraction]);

  // Function to update the current page context
  const updatePageContext = (newContext) => {
    setPageContext(newContext);
    // Record interaction to prevent auto-closing
    setLastInteraction(Date.now());
  };

  // Function to send a message and get a response
  const sendMessage = async (messageText, files = []) => {
    if ((!messageText || !messageText.trim()) && files.length === 0) return;
    
    setIsLoading(true);
    setLastInteraction(Date.now());
    
    try {
      // Create user message object
      const userMessage = {
        text: messageText,
        sender: 'user',
        timestamp: new Date().toISOString(),
        files: files.length > 0 ? files : undefined
      };
      
      // Add user message to chat
      setMessages(prev => [...prev, userMessage]);
      
      let response;
      
      if (apiAvailable) {
        // Use page context in the prompt if available
        const systemPrompt = getSystemPrompt();
        
        if (files && files.length > 0) {
          // Process files for the API
          const fileDataPromises = files.map(async (file) => {
            const cachedFile = fileUploadService.getFile(file.id);
            if (!cachedFile) return null;
            
            return {
              data: cachedFile.content.split(',')[1],
              mimeType: cachedFile.type
            };
          });
          
          const fileData = (await Promise.all(fileDataPromises)).filter(f => f !== null);
          const fileNames = files.map(f => f.name).join(', ');
          
          // Create prompt with context and files
          const prompt = `${systemPrompt}\n\nThe user has uploaded the following files: ${fileNames}.\n\nUser question: ${messageText}`;
          
          // Pass userId for memory persistence
          response = await geminiService.generateContentWithFiles(prompt, fileData, true, userId);
        } else {
          // Text-only prompt
          const prompt = `${systemPrompt}\n\nUser: ${messageText}`;
          // Pass userId for memory persistence
          response = await geminiService.generateContent(prompt, true, userId);
        }
      } else {
        // Fallback response when API is unavailable
        response = "I'm currently operating in offline mode and can't process your request. Please check your API connection.";
      }
      
      // Create and add assistant message
      const assistantMessage = {
        text: response,
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      return { userMessage, assistantMessage };
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message
      const errorMessage = {
        text: "Sorry, I encountered an error while processing your request. Please try again.",
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear the chat history
  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('clearDecisions_global_chat');
  };
  
  // Function to reset user memory
  const resetMemory = async () => {
    if (geminiService.isMemoryAvailable()) {
      try {
        await geminiService.resetUserMemory(userId);
        
        // Add a system message about memory reset
        const resetMessage = {
          text: "Memory has been reset. The assistant will not remember previous conversations.",
          sender: 'system',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, resetMessage]);
        return true;
      } catch (error) {
        console.error("Error resetting memory:", error);
        return false;
      }
    }
    return false;
  };

  // Context value that will be provided
  const contextValue = {
    messages,
    isLoading,
    apiAvailable,
    memoryAvailable,
    pageContext,
    isWidgetOpen,
    userId,
    sendMessage,
    clearChat,
    resetMemory,
    updatePageContext,
    setIsWidgetOpen,
    setLastInteraction
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;