import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const OnboardingProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    loginWithRedirect();
    return null;
  }

  return children;
};

export default OnboardingProtectedRoute;
