// src/components/auth/LoginButton.js
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();

  const handleAuth = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname }
    });
  };

  return (
    <button 
      className="btn btn-primary login-button" 
      onClick={handleAuth}
    >
      Sign In
    </button>
  );
};

export default LoginButton;