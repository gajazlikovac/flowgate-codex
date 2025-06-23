// src/components/Steps/CompanyDetails.js
import React, { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

const CompanyDetails = () => {
  const { companyData, setCompanyData, nextStep } = useOnboarding();
  const [errors, setErrors] = useState({});
  
  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!companyData.name.trim()) {
      newErrors.name = 'Company name is required';
    }
    
    if (!companyData.website.trim()) {
      newErrors.website = 'Company website is required';
    } else if (!/^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?/.test(companyData.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }
    
    if (!companyData.contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }
    
    if (!companyData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(companyData.contactEmail)) {
      newErrors.contactEmail = 'Contact email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      nextStep();
    }
  };
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData({ [name]: value });
  };
  
  return (
    <div className="company-details-container">
      <h2>Data Center Details</h2>
      <p className="description">
        Please provide your company and data center information to get started with the sustainability onboarding process.
      </p>
      
      <form onSubmit={handleSubmit} className="onboarding-form">
        <div className="form-group">
          <label htmlFor="companyName">Company Name *</label>
          <input
            type="text"
            id="companyName"
            name="name"
            value={companyData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <div className="error-message">{errors.name}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="website">Company Website *</label>
          <input
            type="text"
            id="website"
            name="website"
            placeholder="https://example.com"
            value={companyData.website}
            onChange={handleChange}
            className={errors.website ? 'error' : ''}
          />
          {errors.website && <div className="error-message">{errors.website}</div>}
        </div>
        
        <div className="section-divider">
          <h3>Primary Contact</h3>
          <p>Who should we contact regarding sustainability initiatives?</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="contactName">Contact Name *</label>
          <input
            type="text"
            id="contactName"
            name="contactName"
            value={companyData.contactName}
            onChange={handleChange}
            className={errors.contactName ? 'error' : ''}
          />
          {errors.contactName && <div className="error-message">{errors.contactName}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="contactEmail">Contact Email *</label>
          <input
            type="email"
            id="contactEmail"
            name="contactEmail"
            value={companyData.contactEmail}
            onChange={handleChange}
            className={errors.contactEmail ? 'error' : ''}
          />
          {errors.contactEmail && <div className="error-message">{errors.contactEmail}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="contactRole">Role/Title</label>
          <input
            type="text"
            id="contactRole"
            name="contactRole"
            value={companyData.contactRole}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyDetails;