// src/liveblocks.js
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { useEffect } from 'react';

// The URL of your Liveblocks auth server - updated to use GCP deployment
const LIVEBLOCKS_AUTH_URL = process.env.REACT_APP_LIVEBLOCKS_AUTH_URL || "https://liveblocks-866853235757.europe-west3.run.app/api/liveblocks-auth";

console.log("Liveblocks auth URL:", LIVEBLOCKS_AUTH_URL);

// Create a Liveblocks client with either auth endpoint or public key
const client = createClient({
  // We'll use conditionals here to gracefully handle both auth and public key
  authEndpoint: async (room) => {
    console.log(`[Liveblocks] 🔑 Authentication started for room: "${room}"`);
    
    try {
      // Check if Auth0 is available globally (set by LiveblocksProvider)
      if (window.auth0 && window.auth0.getAccessTokenSilently) {
        console.log("[Liveblocks] 🔐 Auth0 is available, getting token...");
        
        // Get token from Auth0
        let token;
        try {
          token = await window.auth0.getAccessTokenSilently();
          console.log(`[Liveblocks] ✅ Got Auth0 token (${token.length} chars): ${token.substring(0, 15)}...`);
        } catch (tokenError) {
          console.error("[Liveblocks] ❌ Failed to get Auth0 token:", tokenError);
          throw tokenError;
        }
        
        // Call our auth endpoint
        console.log(`[Liveblocks] 🔄 Calling auth endpoint: ${LIVEBLOCKS_AUTH_URL}`);
        console.log(`[Liveblocks] 📦 Request payload:`, { room });
        
        let response;
        try {
          response = await fetch(LIVEBLOCKS_AUTH_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ room }),
          });
          
          console.log(`[Liveblocks] 📨 Auth endpoint response status: ${response.status}`);
        } catch (fetchError) {
          console.error("[Liveblocks] ❌ Network error calling auth endpoint:", fetchError);
          throw fetchError;
        }
        
        if (!response.ok) {
          console.error(`[Liveblocks] ❌ Auth endpoint error: ${response.status}`);
          // Try to get error details
          try {
            const errorText = await response.text();
            console.error(`[Liveblocks] 📄 Error response body: ${errorText}`);
          } catch (e) {
            console.error("[Liveblocks] Could not read error response");
          }
          throw new Error(`Auth endpoint returned ${response.status}`);
        }
        
        let result;
        try {
          result = await response.json();
          console.log("[Liveblocks] ✅ Auth successful, received token");
        } catch (jsonError) {
          console.error("[Liveblocks] ❌ Failed to parse auth response as JSON:", jsonError);
          throw jsonError;
        }
        
        return result; // This contains the accessToken
      } else {
        console.warn("[Liveblocks] ⚠️ Auth0 not available, falling back to public key");
        // Debug what's available
        console.log("[Liveblocks] 🔍 window.auth0:", window.auth0);
        
        // Fallback to public key if Auth0 is not available
        return { 
          publicApiKey: "pk_prod_aezZIPlRpCGqXEjSZpNKYKxLdMt140zIw-cUVlr4L4rp8PdKohKvHR6SJurcmQtn"
        };
      }
    } catch (error) {
      console.error("[Liveblocks] ❌ Authentication error:", error);
      console.error("[Liveblocks] Stack trace:", error.stack);
      console.warn("[Liveblocks] ⚠️ Falling back to public key due to error");
      
      return { 
        publicApiKey: "pk_prod_aezZIPlRpCGqXEjSZpNKYKxLdMt140zIw-cUVlr4L4rp8PdKohKvHR6SJurcmQtn"
      };
    }
  }
});

// Create a RoomContext (keeping your working approach)
export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useOthersMapped,
  useOther,
  useBroadcastEvent,
  useEventListener,
  useStorage,
  useMutation,
  useSelf,
  useStatus,
} = createRoomContext(client);

// Enhanced Room component that includes user data from Auth0
// This maintains compatibility with your existing code
export const EnhancedRoomProvider = ({ children, id, initialPresence = {} }) => {
  // This tries to get Auth0 from window, but doesn't require it
  // Works with your existing LiveblocksProvider
  const auth0 = window.auth0 || {};
  const user = auth0.user;
  
  // Debug room connection information
  useEffect(() => {
    console.log(`[Liveblocks] 🔄 Connecting to room: "${id}"`);
    console.log('[Liveblocks] 👤 User from window.auth0:', user);
    
    // Store room ID for debugging
    window.liveblocksRoomId = id;
    
    return () => {
      console.log(`[Liveblocks] 🔌 Disconnected from room: "${id}"`);
    };
  }, [id, user]);
  
  // Add user info to initialPresence if available
  const enhancedPresence = user ? {
    ...initialPresence,
    user: {
      id: user.sub,
      name: user.name || user.email?.split('@')[0] || 'Anonymous',
      email: user.email,
      picture: user.picture
    }
  } : initialPresence;
  
  console.log('[Liveblocks] 📤 Initial presence:', enhancedPresence);
  
  return (
    <RoomProvider 
      id={id} 
      initialPresence={enhancedPresence}
      onConnectionIdle={() => console.log(`[Liveblocks] 💤 Room "${id}" connection idle`)}
      onConnectionError={(error) => console.error(`[Liveblocks] ❌ Room "${id}" connection error:`, error)}
      onConnectionLost={() => console.warn(`[Liveblocks] 📡 Room "${id}" connection lost`)}
      onConnectionOpen={() => console.log(`[Liveblocks] ✅ Room "${id}" connection opened`)}
    >
      {children}
    </RoomProvider>
  );
};