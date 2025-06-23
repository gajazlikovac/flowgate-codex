// src/context/OnboardingContext.js
import React, { createContext, useContext, useReducer } from 'react';

// Define initial state
const initialState = {
  currentStep: 0,
  steps: [
    { id: 'company', label: 'Company Details' },
    { id: 'upload', label: 'Upload Reports' },
    { id: 'extract', label: 'Review Goals' },
    { id: 'confirm', label: 'Confirmation' }
  ],
  companyData: {
    name: '',
    website: '',
    contactEmail: '',
    contactName: '',
    contactRole: ''
  },
  uploadedFiles: [],
  selectedStandards: [],
  skipFileUpload: false,
  extractedGoals: null,
  isProcessing: false,
  error: null
};

// Define reducer for more complex state updates
function onboardingReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return { ...state, currentStep: state.currentStep - 1 };
    case 'SET_COMPANY_DATA':
      return { ...state, companyData: { ...state.companyData, ...action.payload } };
    case 'SET_UPLOADED_FILES':
      return { ...state, uploadedFiles: action.payload };
    case 'SET_SELECTED_STANDARDS':
      return { ...state, selectedStandards: action.payload };
    case 'SET_SKIP_FILE_UPLOAD':
      return { ...state, skipFileUpload: action.payload };
    case 'SET_EXTRACTED_GOALS':
      return { ...state, extractedGoals: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_ONBOARDING':
      return initialState;
    default:
      return state;
  }
}

// Create context
const OnboardingContext = createContext();

// Create provider component
export const OnboardingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  // Helper functions for common operations
  const nextStep = () => dispatch({ type: 'NEXT_STEP' });
  const prevStep = () => dispatch({ type: 'PREV_STEP' });
  const setStep = (step) => dispatch({ type: 'SET_STEP', payload: step });
  const setCompanyData = (data) => dispatch({ type: 'SET_COMPANY_DATA', payload: data });
  const setUploadedFiles = (files) => dispatch({ type: 'SET_UPLOADED_FILES', payload: files });
  const setSelectedStandards = (standards) => dispatch({ type: 'SET_SELECTED_STANDARDS', payload: standards });
  const setSkipFileUpload = (skip) => dispatch({ type: 'SET_SKIP_FILE_UPLOAD', payload: skip });
  const setExtractedGoals = (goals) => dispatch({ type: 'SET_EXTRACTED_GOALS', payload: goals });
  const setProcessing = (isProcessing) => dispatch({ type: 'SET_PROCESSING', payload: isProcessing });
  const setError = (error) => dispatch({ type: 'SET_ERROR', payload: error });
  const resetOnboarding = () => dispatch({ type: 'RESET_ONBOARDING' });

  // Value to be provided by the context
  const value = {
    ...state,
    nextStep,
    prevStep,
    setStep,
    setCompanyData,
    setUploadedFiles,
    setSelectedStandards,
    setSkipFileUpload,
    setExtractedGoals,
    setProcessing,
    setError,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook for using this context
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};