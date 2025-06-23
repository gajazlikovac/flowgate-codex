// src/components/auth/Logout.jsx
import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const Logout = () => {
  const { logout } = useAuth0();

  useEffect(() => {
    // Clear onboarding and any local storage
    localStorage.removeItem('onboarding_complete');
    localStorage.clear();

    // Redirect to Auth0 logout
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [logout]);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2>Logging out...</h2>
    </div>
  );
};

export default Logout;
