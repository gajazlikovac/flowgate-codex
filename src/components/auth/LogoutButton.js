// src/components/auth/LogoutButton.js
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useCustomAuth } from '../../context/CustomAuthContext';

const LogoutButton = () => {
  const { logout } = useAuth0();
  const { logout: customLogout } = useCustomAuth();

  return (
    <button 
      className="btn btn-secondary" 
      onClick={() => {
        customLogout();
        logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        });
      }}
    >
      Log Out
    </button>
  );
};

export default LogoutButton;