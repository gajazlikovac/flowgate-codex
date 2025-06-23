import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import '../../styles/onboarding.css'; // Make sure you import onboarding-specific enhancements

const OnboardingLayout = ({ children }) => {
  const { steps, currentStep } = useOnboarding();

  return (
    <div className="onboarding-wrapper"> {/* ✅ SCOPED WRAPPER */}
      <div className="onboarding-container card"> {/* ✅ Use your global 'card' class */}
        <div className="onboarding-header">
          <h1 className="page-title">Data Centre Onboarding</h1> {/* Use page title style */}
        </div>

        <div className="progress-tracker">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`step ${currentStep >= index ? 'active' : ''} ${currentStep === index ? 'current' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-label">{step.label}</div>
              {index < steps.length - 1 && (
                <div className={`step-connector ${currentStep > index ? 'active' : ''}`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="onboarding-content">
          {children}
        </div>

        <div className="onboarding-footer">
          <p>© {new Date().getFullYear()} The Clear Decisions Company Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
