// src/components/auth/ProtectedRoute.js
import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      loginWithRedirect({
        appState: { returnTo: window.location.pathname },
      });
    }
  }, [isLoading, isAuthenticated, user, loginWithRedirect]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
