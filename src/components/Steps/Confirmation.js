// src/components/Steps/Confirmation.js
import React, { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { saveExtractedGoals, generateEmailHash } from '../../services/goalsService';

const Confirmation = () => {
  const { companyData, extractedGoals, resetOnboarding } = useOnboarding();
  const { user, isAuthenticated } = useAuth0();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const API_URL = 'https://fetching-api-866853235757.europe-west3.run.app';

  const totalGoals = extractedGoals?.pillars.reduce(
    (count, pillar) => count + pillar.goals.length,
    0
  ) || 0;

  const totalTargets = extractedGoals?.pillars.reduce(
    (count, pillar) => count + pillar.goals.reduce(
      (targetCount, goal) => targetCount + goal.targets.length,
      0
    ),
    0
  ) || 0;

  const handleRestart = () => {
    if (window.confirm('Are you sure you want to restart the onboarding process? All your data will be lost.')) {
      resetOnboarding();
    }
  };

  const handleSaveAndGoDashboard = async () => {
    if (!isAuthenticated || !user?.email) {
      alert('User information is incomplete or missing. Please login again.');
      return;
    }

    try {
      setSaving(true);
      
      // Generate a consistent ID based on email
      const userIdentifier = generateEmailHash(user.email);
      const auth0Id = `auth0_${userIdentifier}`;
      
      console.log('Generated auth0_id:', auth0Id);
      
      // First save the user
      await axios.post(`${API_URL}/add-user`, {
        auth0_id: auth0Id,
        email: user.email
      });
      
      console.log('✅ User saved successfully!');
      
      // Then save the extracted goals
      if (extractedGoals) {
        try {
          await saveExtractedGoals(auth0Id, extractedGoals);
          console.log('✅ Goals saved successfully!');
        } catch (goalError) {
          console.error('Failed to save goals:', goalError.response?.data || goalError.message);
          alert('User saved but goals could not be saved. You may need to set up your goals again.');
        }
      }
      
      localStorage.setItem('onboarding_complete', 'true');
      navigate('/');
    } catch (error) {
      console.error('Failed to save user:', error.response?.data || error.message);
      alert('Failed to save user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="confirmation-container">
      <div className="confirmation-header">
        <div className="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 4L12 14.01L9 11.01" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2>Sustainability Onboarding Completed!</h2>
        <p className="success-message">
          Your sustainability goals have been successfully set up and are ready to use.
        </p>
      </div>

      <div className="summary-card">
        <h3>Summary</h3>

        <div className="summary-section">
          <h4>Company Information</h4>
          <div className="summary-details">
            <div className="summary-item">
              <span className="summary-label">Company Name:</span>
              <span className="summary-value">{companyData.name}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Industry:</span>
              <span className="summary-value">{companyData.industry}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Contact:</span>
              <span className="summary-value">{companyData.contactName} ({companyData.contactEmail})</span>
            </div>
            {companyData.contactRole && (
              <div className="summary-item">
                <span className="summary-label">Role:</span>
                <span className="summary-value">{companyData.contactRole}</span>
              </div>
            )}
          </div>
        </div>

        <div className="summary-section">
          <h4>Goals and Targets</h4>
          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-value">{extractedGoals?.pillars.length || 0}</div>
              <div className="stat-label">Pillars</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalGoals}</div>
              <div className="stat-label">Goals</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalTargets}</div>
              <div className="stat-label">Targets</div>
            </div>
          </div>

          <div className="pillar-summary">
            {extractedGoals?.pillars.map(pillar => (
              <div key={pillar.id} className="pillar-item">
                <div className="pillar-name">{pillar.name}</div>
                <div className="pillar-count">{pillar.goals.length} goals</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="next-steps">
        <h3>What's Next?</h3>
        <ul className="steps-list">
          <li>
            <span className="step-icon">📊</span>
            <div className="step-content">
              <h4>Track Progress</h4>
              <p>Monitor your sustainability goals and targets in real-time on your dashboard.</p>
            </div>
          </li>
          <li>
            <span className="step-icon">📝</span>
            <div className="step-content">
              <h4>Update Regularly</h4>
              <p>Keep your sustainability data current by updating progress and adding new goals.</p>
            </div>
          </li>
          <li>
            <span className="step-icon">📈</span>
            <div className="step-content">
              <h4>Generate Reports</h4>
              <p>Create and share sustainability reports with stakeholders.</p>
            </div>
          </li>
        </ul>
      </div>

      <div className="form-actions">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={handleRestart}
        >
          Restart Onboarding
        </button>

        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={handleSaveAndGoDashboard}
          disabled={saving}
          style={{ marginLeft: '10px' }}
        >
          {saving ? 'Saving...' : 'Go to Dashboard'}
        </button>
      </div>
    </div>
  );
};

export default Confirmation;