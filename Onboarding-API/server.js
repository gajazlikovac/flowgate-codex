const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
// Add dotenv to load environment variables
require('dotenv').config();

const app = express();
const PORT = 8080; // Changed port to 3001

// ✅ Configure CORS for the frontend (adjust origin as needed)
app.use(cors({
  origin: [
    'https://cd-frontend-app-866853235757.europe-west3.run.app',
    'https://cd-frontend-alpha-866853235757.europe-west3.run.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// ✅ Handle all OPTIONS requests with a simple middleware for preflight
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ✅ Body parsers for JSON and URL-encoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Multer configuration for file uploads (in-memory, 50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// 🔐 Gemini API configuration using environment variables
const PROJECT_ID = "airy-period-435608-a6" //process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = "us-central1" // process.env.GOOGLE_CLOUD_LOCATION;
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
  // The GoogleAuth library will automatically use GOOGLE_APPLICATION_CREDENTIALS
});

// Log environment variables for debugging (remove in production)
console.log('Project ID:', PROJECT_ID);
console.log('Location:', LOCATION);
console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

// ✅ POST /api/extract-pdf-text: Extracts text from an uploaded PDF
app.post('/api/extract-pdf-text', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const pdfData = await pdf(req.file.buffer);
    res.json({ text: pdfData.text });
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    res.status(500).json({ error: 'Failed to extract text from PDF' });
  }
});

// ✅ POST /api/gemini-extract: Processes a prompt via the Gemini API
app.post('/api/gemini-extract', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    console.log('Authenticating with Google Cloud...');
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const accessToken = token.token || token;
    console.log('Successfully obtained access token');
    
    // Use the generateContent endpoint with the correct project ID
    const endpointUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-1.5-pro:generateContent`;
    console.log(`Calling Gemini API at: ${endpointUrl}`);
    
    // Different payload format for Gemini API
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    };
    
    const response = await axios.post(endpointUrl, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Gemini API response status:', response.status);
    
    // Transform response to match what your application expects
    const formattedResponse = {
      predictions: [{
        content: response.data.candidates[0].content.parts[0].text
      }]
    };
    
    return res.json(formattedResponse);
  } catch (error) {
    console.error('Error calling Gemini API:');
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received, request details:', error.request._currentUrl);
    } else {
      console.error('Error message:', error.message);
    }
    
    // If we get an error, fall back to mock data
    console.log('Falling back to mock data...');
    
    // Generate mock response based on prompt content
    let mockResponse = "";
    
    if (prompt.includes("sustainability") && prompt.includes("goals")) {
      mockResponse = `[
        {
          "pillarId": "env",
          "title": "Reduce Data Center Energy Consumption",
          "description": "Implement energy efficiency measures to reduce overall data center energy usage",
          "category": "energy",
          "due_date": "2025-12-31",
          "targets": ["Reduce PUE to 1.3 by 2025", "Implement advanced cooling optimization"]
        },
        {
          "pillarId": "env",
          "title": "Increase Renewable Energy Usage",
          "description": "Transition to renewable energy sources for data center operations",
          "category": "energy",
          "due_date": "2026-12-31",
          "targets": ["80% renewable energy by 2026", "Install on-site solar where feasible"]
        },
        {
          "pillarId": "soc",
          "title": "Improve Workforce Diversity",
          "description": "Enhance diversity and inclusion across all technical teams",
          "category": "social",
          "due_date": "2025-06-30",
          "targets": ["40% diverse representation in leadership by 2025"]
        },
        {
          "pillarId": "gov",
          "title": "Strengthen Data Security Governance",
          "description": "Implement robust security measures and compliance protocols",
          "category": "compliance",
          "due_date": "2024-12-31",
          "targets": ["Annual ISO 27001 certification", "Quarterly security audits"]
        }
      ]`;
    } else if (prompt.includes("ISO") || prompt.includes("compliance")) {
      mockResponse = `[
        {
          "pillarId": "gov",
          "title": "ISO 27001 Certification",
          "description": "Obtain and maintain ISO 27001 certification for information security management",
          "category": "compliance",
          "due_date": "2024-12-31",
          "targets": ["Complete certification audit", "Establish internal audit program"]
        },
        {
          "pillarId": "gov",
          "title": "Data Protection Compliance",
          "description": "Ensure compliance with global data protection regulations",
          "category": "compliance",
          "due_date": "2024-09-30",
          "targets": ["GDPR compliance review", "Regular staff training"]
        }
      ]`;
    } else {
      // Generic response for any other type of prompt
      mockResponse = `[
        {
          "pillarId": "env",
          "title": "Environmental Sustainability Goal",
          "description": "Generic environmental goal from mock API",
          "category": "environmental",
          "due_date": "2025-12-31",
          "targets": ["Target 1", "Target 2"]
        },
        {
          "pillarId": "soc",
          "title": "Social Responsibility Goal",
          "description": "Generic social goal from mock API",
          "category": "social",
          "due_date": "2025-12-31",
          "targets": ["Target 1", "Target 2"]
        }
      ]`;
    }
    
    console.log("Using mock data as fallback");
    
    return res.json({
      predictions: [{
        content: mockResponse
      }]
    });
  }
});

// ✅ Dummy GET routes for testing purposes
app.get('/api/extract-pdf-text', (req, res) => {
  res.status(200).json({ message: 'Use POST to upload a PDF for text extraction.' });
});

app.get('/api/gemini-extract', (req, res) => {
  res.status(200).json({ message: 'Use POST with a prompt to call Gemini API.' });
});

// ✅ Basic health check route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API server is running' });
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});