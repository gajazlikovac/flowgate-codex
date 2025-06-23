// GeminiService.js - Enhanced with server-side Mem0 Graph Memory integration

class GeminiService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.debug = false;
    
    // Backend URL
    this.apiUrl = process.env.REACT_APP_KG_API_URL || 'https://graph-backend-866853235757.europe-west3.run.app';
    
    // Add conversation session tracking
    this.currentSessionId = null;
    
    // Mem0 integration
    this.memoryInitialized = false;
  }

  /**
   * Initialize the service
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async initialize() {
    // Use singleton pattern to prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve) => {
      try {
        // Initialize Mem0 memory through backend
        await this.initializeMemory();
        
        // Test connection to the backend proxy
        console.log("Testing connection to backend Gemini proxy...");
        const testResponse = await fetch(`${this.apiUrl}/proxy-gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: "Test" })
        });
        
        if (testResponse.ok) {
          // Get response as text first to ensure we get the complete data
          const responseText = await testResponse.text();
          console.log(`✅ Received proxy response: ${responseText.length} characters`);
          
          // Parse the text as JSON
          try {
            // eslint-disable-next-line no-unused-vars
            const data = JSON.parse(responseText);
            console.log("✅ Successfully connected to backend Gemini proxy");
            this.isInitialized = true;
            resolve(true);
          } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError);
            console.log("Response text:", responseText.substring(0, 200) + "...");
            this.isInitialized = false;
            resolve(false);
          }
        } else {
          console.error(`API test failed: ${testResponse.status} ${testResponse.statusText}`);
          try {
            const errorText = await testResponse.text();
            console.error("API error response:", errorText);
          } catch (e) {
            console.error("Could not read error response");
          }
          this.isInitialized = false;
          resolve(false);
        }
      } catch (error) {
        console.error("Failed to initialize Gemini Service:", error);
        this.isInitialized = false;
        resolve(false);
      }
    });

    return this.initializationPromise;
  }

  /**
   * Initialize Mem0 memory service through backend API
   * @returns {Promise<boolean>} True if memory initialization was successful
   */
  async initializeMemory() {
    try {
      console.log("Testing connection to backend Mem0 memory API...");
      
      // Test connection to memory endpoints
      const testResponse = await fetch(`${this.apiUrl}/memory/all/system`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (testResponse.ok) {
        console.log("✅ Successfully connected to backend Mem0 memory API");
        this.memoryInitialized = true;
        return true;
      } else {
        console.error(`Mem0 API test failed: ${testResponse.status} ${testResponse.statusText}`);
        try {
          const errorText = await testResponse.text();
          console.error("API error response:", errorText);
        } catch (e) {
          console.error("Could not read error response");
        }
        this.memoryInitialized = false;
        return false;
      }
    } catch (error) {
      console.error("Failed to initialize Mem0 memory API:", error);
      this.memoryInitialized = false;
      return false;
    }
  }

  /**
   * Reset the conversation session
   */
  resetSession() {
    this.currentSessionId = null;
    console.log("Conversation session reset");
  }

  /**
   * Reset a user's memories
   * @param {string} userId - The user ID to reset memories for
   */
  async resetUserMemory(userId) {
    if (!this.memoryInitialized || !userId) {
      console.warn("Cannot reset memory: Mem0 not initialized or no userId provided");
      return false;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/memory/all/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`🗑️ Reset all memories for user: ${userId}`);
        return true;
      } else {
        console.error(`Failed to reset memory: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error("Error resetting user memory:", error);
      return false;
    }
  }

  /**
   * Add a memory through the backend API
   * @param {string} text - Text to add to memory
   * @param {string} userId - User ID for memory context
   * @returns {Promise<boolean>} Success status
   */
  async addMemory(text, userId) {
    if (!this.memoryInitialized || !userId) {
      console.warn("Cannot add memory: Mem0 not initialized or no userId provided");
      return false;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/memory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId })
      });
      
      if (response.ok) {
        console.log(`📝 Added memory for user: ${userId}`);
        return true;
      } else {
        console.error(`Failed to add memory: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error("Error adding memory:", error);
      return false;
    }
  }

  /**
   * Search memories through the backend API
   * @param {string} query - Search query
   * @param {string} userId - User ID for memory context
   * @returns {Promise<string>} Search results
   */
  async searchMemory(query, userId) {
    if (!this.memoryInitialized || !userId) {
      console.warn("Cannot search memory: Mem0 not initialized or no userId provided");
      return "";
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Found memories for user: ${userId}`);
        return data.results || "";
      } else {
        console.error(`Failed to search memory: ${response.status} ${response.statusText}`);
        return "";
      }
    } catch (error) {
      console.error("Error searching memory:", error);
      return "";
    }
  }

  /**
   * Query the Knowledge Graph API backend with session support
   * @param {string} query - The question to ask
   * @param {string} userId - Optional user ID for memory persistence
   * @returns {Promise<string>} The AI response with knowledge graph data
   */
  async queryKnowledgeGraph(query, userId = null) {
    try {
      console.log(`🔍 Querying Knowledge Graph API with: "${query}"`);
      
      // Store the query in Mem0 memory if available
      if (this.memoryInitialized && userId) {
        try {
          await this.addMemory(`User: ${query}`, userId);
          console.log(`📝 Stored user query in Mem0 memory for user: ${userId}`);
        } catch (memError) {
          console.warn("⚠️ Failed to store query in Mem0:", memError);
        }
      }
      
      // Prepare request body with session ID if available
      const requestBody = { 
        query,
        max_results: 10, 
        threshold: 0.3
      };
      
      // Include session ID if we have one
      if (this.currentSessionId) {
        requestBody.session_id = this.currentSessionId;
        console.log(`🔗 Using existing session ID: ${this.currentSessionId}`);
      } else {
        console.log("🆕 Starting new conversation session");
      }
      
      const response = await fetch(`${this.apiUrl}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        console.error(`Knowledge Graph API error: ${response.status} ${response.statusText}`);
        try {
          const errorText = await response.text();
          console.error("Error response:", errorText);
        } catch (e) {
          console.error("Could not read error response");
        }
        throw new Error(`Knowledge Graph API error: ${response.status}`);
      }
      
      // Get the response as text first to ensure we get the complete data
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        console.error("Failed to read response text:", e);
        throw new Error("Failed to read API response");
      }
      
      if (!responseText) {
        console.error("Empty response from Knowledge Graph API");
        throw new Error("Empty response from Knowledge Graph API");
      }
      
      console.log(`📏 Response size: ${responseText.length} characters`);
      
      // Parse the text as JSON
      try {
        const data = JSON.parse(responseText);
        console.log(`✅ Received response from Knowledge Graph API`);
        
        // Check for valid answer field
        if (!data) {
          console.error("Invalid response format, null or undefined:", data);
          throw new Error("Invalid response format from Knowledge Graph API");
        }
        
        if (typeof data !== 'object') {
          console.error("Invalid response format, not an object:", typeof data);
          throw new Error("Invalid response format, not an object");
        }
        
        if (!Object.prototype.hasOwnProperty.call(data, 'answer')) {
          console.error("Response missing 'answer' field:", Object.keys(data));
          throw new Error("Response missing answer field");
        }
        
        // Safely get the answer
        let answer = data.answer;
        
        // Ensure answer is a string
        if (answer === null || answer === undefined) {
          console.error("Answer is null or undefined");
          throw new Error("Answer is null or undefined");
        }
        
        if (typeof answer !== 'string') {
          console.warn(`⚠️ Answer is not a string but ${typeof answer}, attempting conversion`);
          
          // Try to convert to string if possible
          try {
            answer = String(answer);
          } catch (e) {
            console.error("Failed to convert answer to string:", e);
            throw new Error("Answer is not a string and couldn't be converted");
          }
          
          if (!answer) {
            console.error("Converted answer is empty");
            throw new Error("Converted answer is empty");
          }
        }
        
        // Check for answer truncation
        console.log(`📏 Answer length: ${answer.length} characters`);
        if (answer.length > 0) {
          console.log(`📏 Answer preview: ${answer.substring(0, 100)}...`);
        } else {
          console.warn("⚠️ Answer is empty");
          return "The Knowledge Graph API returned an empty response.";
        }
        
        // Save session ID for future requests if available
        if (data.query_details && data.query_details.session_id) {
          this.currentSessionId = data.query_details.session_id;
          console.log(`🔗 Saved session ID for future requests: ${this.currentSessionId}`);
        }
        
        // Format the response to highlight KG citations
        const formattedAnswer = this.formatKnowledgeGraphResponse(answer);
        
        // Store the response in Mem0 memory if available
        if (this.memoryInitialized && userId) {
          try {
            await this.addMemory(`Assistant: ${formattedAnswer}`, userId);
            console.log(`📝 Stored assistant response in Mem0 memory for user: ${userId}`);
          } catch (memError) {
            console.warn("⚠️ Failed to store response in Mem0:", memError);
          }
        }
        
        return formattedAnswer;
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.log("Response text:", responseText.substring(0, 200) + "...");
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
    } catch (error) {
      console.error("❌ Error querying Knowledge Graph API:", error);
      console.log("🔄 Falling back to proxied Gemini API");
      
      // Fall back to proxied Gemini API
      return this.generateContent(query, false, userId);
    }
  }

  /**
   * Format knowledge graph response to highlight citations
   * @param {string} text - The text response
   * @returns {string} Formatted text with highlighted citations
   */
  formatKnowledgeGraphResponse(text) {
    // More robust error handling
    if (!text) {
      console.error("Invalid response text: empty or undefined");
      return "Error: Received invalid response format from Knowledge Graph API.";
    }
    
    if (typeof text !== 'string') {
      console.error("Invalid response text: not a string", typeof text);
      try {
        text = String(text);
      } catch (e) {
        return "Error: Response is not in text format.";
      }
    }
    
    try {
      console.log("Starting formatting with text length:", text.length);
      
      // SIMPLIFIED APPROACH: Fix only specific issues we've consistently seen
      
      // 1. First, normalize the markdown formatting (fix mismatched asterisks)
      // Fix inconsistent list item formatting
      let fixedText = text
        .replace(/\*([^*:]+):\*\*/g, '**$1:**')      // Fix *Header:** -> **Header:**
        .replace(/\* \*([^*:]+):\*\*/g, '* **$1:**') // Fix * *Header:** -> * **Header:**
        .replace(/\* \*References:\*\*/g, '**References:**')  // Fix * *References:** -> **References:**
        .replace(/\* \*\*References:\*\*/g, '**References:**'); // Fix * **References:** -> **References:**
      
      // 2. Fix formatting issues but preserve the actual source names
      // Only fix "Message - Untitled" references - do not replace specific standard names
      fixedText = fixedText
        .replace(/\(Source: Message - Untitled\)/g, '(Source: Knowledge Graph)');
      
      // 3. Ensure blank line before References section
      fixedText = fixedText
        .replace(/([^\n])\n\*\*References:/g, '$1\n\n**References:')
        .replace(/([^\n])\n\*\*References\*\*/g, '$1\n\n**References**');
      
      console.log("Basic formatting complete");
      
      return fixedText;
    } catch (error) {
      console.error("Error formatting response:", error);
      // Return original text if formatting fails
      return text;
    }
  }

  /**
   * Generate content using the proxied Gemini API
   * @param {string} prompt - The prompt text to send to Gemini
   * @param {boolean} useKnowledgeGraph - Whether to include the knowledge graph
   * @param {string} userId - Optional user ID for memory persistence
   * @returns {Promise<string>} The generated text response
   */
  async generateContent(prompt, useKnowledgeGraph = true, userId = null) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return "Error: Could not initialize the Gemini Service. Please try again later.";
      }
    }

    try {
      // Store the user query in Mem0 if available
      if (this.memoryInitialized && userId) {
        try {
          await this.addMemory(`User: ${prompt}`, userId);
          console.log(`📝 Stored user prompt in Mem0 memory for user: ${userId}`);
        } catch (memError) {
          console.warn("⚠️ Failed to store prompt in Mem0:", memError);
        }
      }
      
      // Retrieve relevant memories from Mem0 if available
      let enhancedPrompt = prompt;
      if (this.memoryInitialized && userId) {
        try {
          console.log(`🔍 Retrieving relevant memories for user: ${userId}`);
          const memories = await this.searchMemory(prompt, userId);
          
          if (memories && memories.length > 0) {
            console.log(`✅ Found relevant memories: ${memories.length} characters`);
            // Add memories as context to the prompt
            enhancedPrompt = `Previous relevant conversation:\n${memories}\n\nCurrent query: ${prompt}`;
          } else {
            console.log("ℹ️ No relevant memories found");
          }
        } catch (memError) {
          console.warn("⚠️ Failed to retrieve memories from Mem0:", memError);
        }
      }
      
      // If knowledge graph enhancement is requested, try to use it first
      if (useKnowledgeGraph) {
        try {
          console.log("📊 Attempting to use Knowledge Graph API");
          return await this.queryKnowledgeGraph(enhancedPrompt, userId);
        } catch (kgError) {
          console.warn("⚠️ Knowledge Graph API failed, falling back to proxied Gemini:", kgError);
          // Continue with proxied Gemini API
        }
      }
      
      // Use proxied Gemini API through the backend
      console.log("🤖 Using proxied Gemini API through backend");
      console.log(`🔍 Query: "${enhancedPrompt.substring(0, 50)}..."`);
      
      const response = await fetch(`${this.apiUrl}/proxy-gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt })
      });
      
      if (!response.ok) {
        console.error(`Proxy error: ${response.status} ${response.statusText}`);
        try {
          const errorText = await response.text();
          console.error("Error response:", errorText);
        } catch (e) {
          console.error("Could not read error response");
        }
        throw new Error(`Proxy error: ${response.status}`);
      }
      
      // Get the response as text first to ensure we get the complete data
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        console.error("Failed to read response text:", e);
        throw new Error("Failed to read proxy response");
      }
      
      if (!responseText) {
        console.error("Empty response from proxy");
        throw new Error("Empty response from proxy");
      }
      
      console.log(`📏 Response size: ${responseText.length} characters`);
      
      // Parse the text as JSON
      try {
        const data = JSON.parse(responseText);
        console.log("✅ Proxied Gemini content generation complete");
        
        // Check if text field exists and is a string
        if (!data) {
          console.error("Invalid response format, null or undefined");
          throw new Error("Invalid response format from proxy");
        }
        
        if (typeof data !== 'object') {
          console.error("Invalid response format, not an object:", typeof data);
          throw new Error("Invalid response format, not an object");
        }
        
        if (!Object.prototype.hasOwnProperty.call(data, 'text')) {
          console.error("Response missing 'text' field:", Object.keys(data));
          throw new Error("Response missing text field");
        }
        
        // Safely get the text
        let text = data.text;
        
        // Ensure text is a string
        if (text === null || text === undefined) {
          console.error("Text is null or undefined");
          throw new Error("Text is null or undefined");
        }
        
        if (typeof text !== 'string') {
          console.warn(`⚠️ Text is not a string but ${typeof text}, attempting conversion`);
          
          // Try to convert to string if possible
          try {
            text = String(text);
          } catch (e) {
            console.error("Failed to convert text to string:", e);
            throw new Error("Text is not a string and couldn't be converted");
          }
          
          if (!text) {
            console.error("Converted text is empty");
            throw new Error("Converted text is empty");
          }
        }
        
        console.log(`📏 Text length: ${text.length} characters`);
        console.log(`📏 Text preview: ${text.substring(0, 100)}...`);
        
        // Store the response in Mem0 memory if available
        if (this.memoryInitialized && userId) {
          try {
            await this.addMemory(`Assistant: ${text}`, userId);
            console.log(`📝 Stored assistant response in Mem0 memory for user: ${userId}`);
          } catch (memError) {
            console.warn("⚠️ Failed to store response in Mem0:", memError);
          }
        }
        
        return text;
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.log("Response text:", responseText.substring(0, 200) + "...");
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
    } catch (error) {
      console.error("Error generating content with proxied Gemini API:", error);
      return `Error accessing Gemini API: ${error.message}`;
    }
  }

  /**
   * Generate content with file data
   * @param {string} prompt - The text prompt
   * @param {Array} fileData - Array of file data objects with mimeType and data properties
   * @param {boolean} useKnowledgeGraph - Whether to include the knowledge graph
   * @param {string} userId - Optional user ID for memory persistence
   * @returns {Promise<string>} The generated text response
   */
  async generateContentWithFiles(prompt, fileData = [], useKnowledgeGraph = true, userId = null) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return "Error: Could not initialize the Gemini Service. Please try again later.";
      }
    }

    try {
      // Store the user query in Mem0 if available
      if (this.memoryInitialized && userId) {
        try {
          const fileNames = fileData.map(f => f.mimeType.split('/')[1]).join(', ');
          await this.addMemory(`User: ${prompt} [with ${fileData.length} files: ${fileNames}]`, userId);
          console.log(`📝 Stored user prompt with files in Mem0 memory for user: ${userId}`);
        } catch (memError) {
          console.warn("⚠️ Failed to store prompt in Mem0:", memError);
        }
      }
      
      // Retrieve relevant memories from Mem0 if available
      let enhancedPrompt = prompt;
      if (this.memoryInitialized && userId) {
        try {
          console.log(`🔍 Retrieving relevant memories for user: ${userId}`);
          const memories = await this.searchMemory(prompt, userId);
          
          if (memories && memories.length > 0) {
            console.log(`✅ Found relevant memories: ${memories.length} characters`);
            // Add memories as context to the prompt
            enhancedPrompt = `Previous relevant conversation:\n${memories}\n\nCurrent query: ${prompt}`;
          } else {
            console.log("ℹ️ No relevant memories found");
          }
        } catch (memError) {
          console.warn("⚠️ Failed to retrieve memories from Mem0:", memError);
        }
      }
      
      // If knowledge graph is requested and no files, try to use it first
      if (useKnowledgeGraph && !fileData.length) {
        try {
          console.log("📊 Attempting to use Knowledge Graph API for file-less query");
          return await this.queryKnowledgeGraph(enhancedPrompt, userId);
        } catch (kgError) {
          console.warn("⚠️ Knowledge Graph API failed, continuing with proxied Gemini:", kgError);
        }
      }

      // For now, we'll just send the prompt without files to the proxy
      // File handling would require additional backend support
      console.log(`🔄 Using proxied Gemini with ${fileData.length} files (note: files not fully supported yet)`);
      
      const response = await fetch(`${this.apiUrl}/proxy-gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt })
      });
      
      if (!response.ok) {
        console.error(`Proxy error: ${response.status} ${response.statusText}`);
        try {
          const errorText = await response.text();
          console.error("Error response:", errorText);
        } catch (e) {
          console.error("Could not read error response");
        }
        throw new Error(`Proxy error: ${response.status}`);
      }
      
      // Get the response as text first to ensure we get the complete data
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        console.error("Failed to read response text:", e);
        throw new Error("Failed to read proxy response");
      }
      
      if (!responseText) {
        throw new Error("Empty response from proxy");
      }
      
      console.log(`📏 Response size: ${responseText.length} characters`);
      
      // Parse the text as JSON with better error handling
      try {
        const data = JSON.parse(responseText);
        console.log("✅ Proxied Gemini content generation complete");
        
        // Check if text field exists and is a string
        if (!data || !data.text) {
          throw new Error("Response missing text field");
        }
        
        if (typeof data.text !== 'string') {
          // Try to convert to string
          try {
            data.text = String(data.text || '');
          } catch (e) {
            throw new Error("Text field could not be converted to string");
          }
          
          if (!data.text) {
            throw new Error("Text field is empty after conversion");
          }
        }
        
        // Store the response in Mem0 memory if available
        if (this.memoryInitialized && userId) {
          try {
            await this.addMemory(`Assistant: ${data.text}`, userId);
            console.log(`📝 Stored assistant response in Mem0 memory for user: ${userId}`);
          } catch (memError) {
            console.warn("⚠️ Failed to store response in Mem0:", memError);
          }
        }
        
        return data.text;
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.log("Response text:", responseText.substring(0, 200) + "...");
        throw new Error("Invalid JSON response from Gemini API");
      }
    } catch (error) {
      console.error("Error generating content with files:", error);
      return `Error with file processing: ${error.message}`;
    }
  }

  /**
   * Get all memories for a user
   * @param {string} userId - The user ID to get memories for
   * @returns {Promise<Array>} Array of memories or empty array if not available
   */
  async getUserMemories(userId) {
    if (!this.memoryInitialized || !userId) {
      console.warn("Cannot get memories: Mem0 not initialized or no userId provided");
      return [];
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/memory/all/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📚 Retrieved memories for user: ${userId}`);
        return data.memories || [];
      } else {
        console.error(`Failed to get memories: ${response.status} ${response.statusText}`);
        return [];
      }
    } catch (error) {
      console.error("Error getting user memories:", error);
      return [];
    }
  }

  /**
   * Check if the API service is available
   * @returns {boolean} True if the service is initialized
   */
  isAvailable() {
    return this.isInitialized;
  }
  
  /**
   * Check if memory service is available
   * @returns {boolean} True if memory is initialized
   */
  isMemoryAvailable() {
    return this.memoryInitialized;
  }
  
  /**
   * Get the current session ID
   * @returns {string|null} Current session ID or null if no active session
   */
  getSessionId() {
    return this.currentSessionId;
  }
  
  /**
   * Enable or disable debug mode
   * @param {boolean} enable Whether to enable debug mode
   */
  setDebugMode(enable = true) {
    this.debug = enable;
    console.log(`${enable ? '🐛 Enabled' : '🔄 Disabled'} debug mode`);
  }
}

// Export as singleton
const geminiService = new GeminiService();
export default geminiService;