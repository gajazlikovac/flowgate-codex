// src/components/auth/OnboardingGuard.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const OnboardingGuard = ({ children }) => {
  const onboardingComplete = localStorage.getItem('onboarding_complete');
  const location = useLocation();

  // Allow access to onboarding pages always
  if (location.pathname.startsWith('/onboarding')) {
    return children;
  }

  // If onboarding not complete, redirect to onboarding
  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  // If complete, allow access
  return children;
};

export default OnboardingGuard;
