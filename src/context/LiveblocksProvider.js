// src/context/LiveblocksProvider.js
import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

/**
 * LiveblocksProvider makes Auth0 context available to the Liveblocks client.
 * This component should wrap your application to provide authentication context.
 */
const LiveblocksProvider = ({ children }) => {
  const auth0Context = useAuth0();
  
  useEffect(() => {
    // Make Auth0 available globally for the Liveblocks client
    if (auth0Context) {
      window.auth0 = auth0Context;
    }
    
    return () => {
      // Clean up when component unmounts
      delete window.auth0;
    };
  }, [auth0Context]);
  
  return <>{children}</>;
};

export default LiveblocksProvider;