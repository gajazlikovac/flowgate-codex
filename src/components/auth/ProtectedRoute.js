// src/components/auth/ProtectedRoute.js
import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '../../context/CustomAuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const { isAuthenticated: customAuth } = useCustomAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !customAuth && (!isAuthenticated || !user)) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, user, customAuth, navigate]);

  if (isLoading || (!isAuthenticated && !customAuth) || (!user && !customAuth)) {
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
