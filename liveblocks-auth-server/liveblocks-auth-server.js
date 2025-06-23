// liveblocks-auth-server.js - With improved token handling
const express = require('express');
const { Liveblocks } = require('@liveblocks/node');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// CORS setup
app.use(cors({
  origin: [
    "https://cd-frontend-app-866853235757.europe-west3.run.app",
    'https://cd-frontend-alpha-866853235757.europe-west3.run.app',
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Initialize Liveblocks with secret key
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || 'sk_prod_eQ1pksmyjxQ1RG1Nehac4bv9esr3y3DkohPxm28uNxGkdJtsGfQuNmrlYo598QY3',
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'liveblocks-auth' });
});

// Special endpoint that doesn't require auth token
app.post('/api/liveblocks-simple-auth', async (req, res) => {
  try {
    // Use a dummy user ID for testing
    const userId = 'test-user-' + Date.now();
    console.log(`Creating test session for ${userId}`);
    
    const session = liveblocks.prepareSession(userId);
    session.allow('*', session.FULL_ACCESS);
    
    const { status, body } = await session.authorize();
    return res.status(status).send(body);
  } catch (error) {
    console.error('Simple auth error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Main auth endpoint with improved token handling
app.post('/api/liveblocks-auth', async (req, res) => {
  try {
    // Log headers for debugging
    console.log('Request headers:', req.headers);
    
    // Get Auth0 token from Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    console.log(`Token length: ${token.length}`);
    console.log(`Token first 20 chars: ${token.substring(0, 20)}`);
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Try different approaches to extract user info
    let userId = 'anonymous-user';
    let email = 'anonymous@example.com';
    
    try {
      // First try: Direct JWT decode
      const decoded = jwt.decode(token);
      if (decoded) {
        userId = decoded.sub || userId;
        email = decoded.email || email;
        console.log('Successfully decoded token with jwt.decode');
      } else {
        // Second try: Manual Base64 decode
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            // JWT format - try to decode the payload (middle part)
            const payload = Buffer.from(parts[1], 'base64').toString();
            const payloadObj = JSON.parse(payload);
            
            userId = payloadObj.sub || userId;
            email = payloadObj.email || email;
            console.log('Successfully decoded token with manual base64 decode');
          } else {
            console.warn('Token does not have standard JWT format (3 parts)');
          }
        } catch (base64Error) {
          console.error('Error with manual token decode:', base64Error);
        }
      }
    } catch (tokenError) {
      console.error('Error decoding token:', tokenError);
      // Continue with default values
    }
    
    // Always create a session, even if token parsing failed
    console.log(`Creating Liveblocks session for user ${userId}`);
    
    // Get the room ID from the request body
    const { room } = req.body;
    
    // Create Liveblocks session
    const session = liveblocks.prepareSession(
      userId, 
      { 
        userInfo: { 
          name: email.split('@')[0],
          email: email
        } 
      }
    );
    
    // Grant access to rooms
    if (room) {
      session.allow(room, session.FULL_ACCESS);
    } else {
      session.allow('*', session.FULL_ACCESS);
    }
    
    // Authorize the session and return the token
    const { status, body } = await session.authorize();
    return res.status(status).send(body);
  } catch (error) {
    console.error('Liveblocks authorization error:', error);
    return res.status(500).json({ 
      error: 'Failed to authorize Liveblocks session',
      message: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🔒 Liveblocks authentication service running on port ${PORT}`);
});