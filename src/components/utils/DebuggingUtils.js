// DebugUtils.js - Create this file in your components folder

/**
 * Utility class for debugging API interactions and tracking requests
 */
class DebugUtils {
    constructor() {
      this.isDebugMode = process.env.NODE_ENV === 'development';
      this.requests = [];
      this.maxLogs = 50;
    }
  
    /**
     * Toggle debug mode
     * @param {boolean} isEnabled - Whether debug mode should be enabled
     */
    setDebugMode(isEnabled) {
      this.isDebugMode = isEnabled;
      console.log(`Debug mode ${isEnabled ? 'enabled' : 'disabled'}`);
    }
  
    /**
     * Log an API request with details
     * @param {string} type - Type of request
     * @param {object} details - Request details
     */
    logApiRequest(type, details) {
      if (!this.isDebugMode) return;
      
      const requestLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type,
        details,
        status: 'pending'
      };
      
      this.requests.unshift(requestLog);
      
      // Trim logs if needed
      if (this.requests.length > this.maxLogs) {
        this.requests = this.requests.slice(0, this.maxLogs);
      }
      
      console.log(`🔄 API Request (${type}):`, details);
      
      return requestLog.id;
    }
    
    /**
     * Update a logged request with response
     * @param {number} requestId - ID of the request to update
     * @param {string} status - New status (success/error)
     * @param {object} response - Response data
     */
    updateApiRequest(requestId, status, response) {
      if (!this.isDebugMode) return;
      
      const requestIndex = this.requests.findIndex(r => r.id === requestId);
      if (requestIndex === -1) return;
      
      this.requests[requestIndex].status = status;
      this.requests[requestIndex].response = response;
      this.requests[requestIndex].completedAt = new Date().toISOString();
      
      const emoji = status === 'success' ? '✅' : '❌';
      console.log(`${emoji} API Response (${this.requests[requestIndex].type}):`, response);
    }
    
    /**
     * Get all logged requests
     * @returns {Array} All logged requests
     */
    getRequests() {
      return [...this.requests];
    }
    
    /**
     * Clear all logged requests
     */
    clearRequests() {
      this.requests = [];
      console.log('🧹 Cleared all request logs');
    }
    
    /**
     * Test the API connection with detailed debugging
     * @param {object} geminiService - The GeminiService instance
     * @returns {Promise<object>} Connection status and details
     */
    async testApiConnection(geminiService) {
      if (!geminiService) {
        return { success: false, error: 'GeminiService not provided' };
      }
      
      const requestId = this.logApiRequest('connection-test', { timestamp: new Date().toISOString() });
      
      try {
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        
        if (!apiKey) {
          this.updateApiRequest(requestId, 'error', { error: 'API key not found in environment variables' });
          return { 
            success: false, 
            error: 'API key not found',
            details: 'The REACT_APP_GEMINI_API_KEY environment variable is missing or empty'
          };
        }
        
        // Log key details (safely)
        const keyDetails = {
          keyLength: apiKey.length,
          keyPrefix: apiKey.substring(0, 3) + '...',
          keyHasCommonPattern: apiKey.startsWith('AIza')
        };
        
        // Try to initialize the service
        const initialized = await geminiService.initialize();
        
        if (!initialized) {
          this.updateApiRequest(requestId, 'error', { 
            error: 'Initialization failed',
            keyDetails
          });
          return {
            success: false,
            error: 'Initialization failed',
            details: 'The API client failed to initialize. Check the console for more details.',
            keyDetails
          };
        }
        
        // Test a basic query
        const testResponse = await geminiService.generateContent('Hello, this is a test message to verify API connectivity.');
        
        this.updateApiRequest(requestId, 'success', { 
          response: 'API test successful',
          keyDetails
        });
        
        return {
          success: true,
          details: 'Successfully connected to Gemini API',
          keyDetails,
          testResponse: testResponse.substring(0, 100) + '...'
        };
      } catch (error) {
        this.updateApiRequest(requestId, 'error', { 
          error: error.message,
          stack: error.stack
        });
        
        return {
          success: false,
          error: error.message,
          details: 'An error occurred while testing the API connection',
          stack: error.stack
        };
      }
    }
  }
  
  // Export as singleton
  const debugUtils = new DebugUtils();
  export default debugUtils;