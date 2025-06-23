// src/pages/OnboardingFlow.js
import React, { useEffect } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import OnboardingLayout from '../components/layout/OnboardingLayout';
import CompanyDetails from '../components/Steps/CompanyDetails';
import ReportUpload from '../components/Steps/ReportUpload';
import GoalExtraction from '../components/Steps/GoalExtraction';
import Confirmation from '../components/Steps/Confirmation';

const OnboardingFlow = () => {
  const { currentStep, error, setError } = useOnboarding();

  // Clear error when step changes
  useEffect(() => {
    setError(null);
  }, [currentStep, setError]);

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <CompanyDetails />;
      case 1:
        return <ReportUpload />;
      case 2:
        return <GoalExtraction />;
      case 3:
        return <Confirmation />;
      default:
        return <CompanyDetails />;
    }
  };

  return (
    <OnboardingLayout>
      {error && (
        <div className="error-alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{error}</span>
          <button 
            className="close-error" 
            onClick={() => setError(null)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {renderStep()}
    </OnboardingLayout>
  );
};

export default OnboardingFlow;