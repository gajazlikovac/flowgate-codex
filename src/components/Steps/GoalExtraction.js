// src/components/Steps/GoalExtraction.js
import React, { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

const GoalExtraction = () => {
  const { 
    extractedGoals, 
    setExtractedGoals, 
    nextStep, 
    prevStep, 
    setError,
    isProcessing,
    setProcessing
  } = useOnboarding();
  
  const [editingGoalId, setEditingGoalId] = useState(null);
  
  // If no extracted goals are available, show loading or error
  if (!extractedGoals) {
    return (
      <div className="goal-extraction-container">
        <h2>Analyzing Reports</h2>
        <div className="processing-indicator">
          <div className="spinner"></div>
          <p>We're still analyzing your sustainability reports...</p>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={prevStep}
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }
  
  // Function to update a goal
  const updateGoal = (pillarId, goalId, updatedData) => {
    const newGoals = JSON.parse(JSON.stringify(extractedGoals));
    
    const pillar = newGoals.pillars.find(p => p.id === pillarId);
    if (pillar) {
      const goalIndex = pillar.goals.findIndex(g => g.id === goalId);
      if (goalIndex !== -1) {
        pillar.goals[goalIndex] = {
          ...pillar.goals[goalIndex],
          ...updatedData
        };
      }
    }
    
    setExtractedGoals(newGoals);
  };
  
  // Function to add a new goal
  const addGoal = (pillarId) => {
    const newGoals = JSON.parse(JSON.stringify(extractedGoals));
    
    const pillarIndex = newGoals.pillars.findIndex(p => p.id === pillarId);
    if (pillarIndex !== -1) {
      const newId = `${pillarId}-goal-${Date.now()}`;
      
      newGoals.pillars[pillarIndex].goals.push({
        id: newId,
        title: 'New Goal',
        description: '',
        category: pillarId === 'env' ? 'environmental' : 
                  pillarId === 'soc' ? 'social' : 'governance',
        progress: 0,
        due_date: new Date().toISOString().split('T')[0],
        targets: []
      });
      
      setExtractedGoals(newGoals);
      setEditingGoalId(newId);
    }
  };
  
  // Function to add a target to a goal
  const addTarget = (pillarId, goalId) => {
    const newGoals = JSON.parse(JSON.stringify(extractedGoals));
    
    const pillar = newGoals.pillars.find(p => p.id === pillarId);
    if (pillar) {
      const goal = pillar.goals.find(g => g.id === goalId);
      if (goal) {
        goal.targets.push({
          name: '',
          status: 'Not started',
          progress: 0
        });
      }
    }
    
    setExtractedGoals(newGoals);
  };
  
  // Function to update a target
  const updateTarget = (pillarId, goalId, targetIndex, updatedData) => {
    const newGoals = JSON.parse(JSON.stringify(extractedGoals));
    
    const pillar = newGoals.pillars.find(p => p.id === pillarId);
    if (pillar) {
      const goal = pillar.goals.find(g => g.id === goalId);
      if (goal && goal.targets[targetIndex]) {
        goal.targets[targetIndex] = {
          ...goal.targets[targetIndex],
          ...updatedData
        };
      }
    }
    
    setExtractedGoals(newGoals);
  };
  
  // Function to remove a target
  const removeTarget = (pillarId, goalId, targetIndex) => {
    const newGoals = JSON.parse(JSON.stringify(extractedGoals));
    
    const pillar = newGoals.pillars.find(p => p.id === pillarId);
    if (pillar) {
      const goal = pillar.goals.find(g => g.id === goalId);
      if (goal) {
        goal.targets.splice(targetIndex, 1);
      }
    }
    
    setExtractedGoals(newGoals);
  };
  
  // Function to save goals and continue
  const saveGoals = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      // In a real application, you would save the goals to your backend here
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      nextStep();
    } catch (error) {
      console.error('Error saving goals:', error);
      setError('An error occurred while saving your goals. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  // Get confidence percentage
  const confidencePercentage = Math.round(extractedGoals.confidence * 100);
  
  // Define goal categories
  const goalCategories = [
    { value: 'energy', label: 'Energy' },
    { value: 'emissions', label: 'Emissions' },
    { value: 'waste', label: 'Waste & Recycling' },
    { value: 'water', label: 'Water' },
    { value: 'biodiversity', label: 'Biodiversity' },
    { value: 'environmental', label: 'Environmental (Other)' },
    { value: 'social', label: 'Social' },
    { value: 'governance', label: 'Governance' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'regulatory', label: 'Regulatory' }
  ];
  
  return (
    <div className="goal-extraction-container">
      <h2>Review Extracted Sustainability Goals</h2>
      <p className="description">
        We've analyzed your reports and identified the following sustainability goals. 
        Please review and make any necessary adjustments before saving.
      </p>
      
      <div className="extraction-confidence">
        <div className="confidence-indicator">
          <div 
            className="confidence-bar" 
            style={{ width: `${confidencePercentage}%` }}
          ></div>
        </div>
        <p className="confidence-text">
          Extraction confidence: <strong>{confidencePercentage}%</strong>
        </p>
      </div>
      
      <div className="pillars-container">
        {extractedGoals.pillars.map(pillar => (
          <div key={pillar.id} className="pillar-section">
            <h3 className="pillar-title">{pillar.name}</h3>
            <p className="pillar-description">{pillar.description}</p>
            
            <div className="goals-list">
              {pillar.goals.map(goal => (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <h4 className="goal-title">{goal.title}</h4>
                    <button 
                      type="button"
                      className="btn-edit"
                      onClick={() => setEditingGoalId(goal.id === editingGoalId ? null : goal.id)}
                      disabled={isProcessing}
                    >
                      {goal.id === editingGoalId ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  
                  {goal.id === editingGoalId ? (
                    <div className="goal-edit-form">
                      <div className="form-group">
                        <label htmlFor={`goal-title-${goal.id}`}>Title:</label>
                        <input
                          type="text"
                          id={`goal-title-${goal.id}`}
                          value={goal.title}
                          onChange={(e) => updateGoal(pillar.id, goal.id, { title: e.target.value })}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor={`goal-desc-${goal.id}`}>Description:</label>
                        <textarea
                          id={`goal-desc-${goal.id}`}
                          value={goal.description}
                          onChange={(e) => updateGoal(pillar.id, goal.id, { description: e.target.value })}
                          rows="3"
                        ></textarea>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`goal-category-${goal.id}`}>Category:</label>
                          <select
                            id={`goal-category-${goal.id}`}
                            value={goal.category}
                            onChange={(e) => updateGoal(pillar.id, goal.id, { category: e.target.value })}
                          >
                            {goalCategories.map(category => (
                              <option key={category.value} value={category.value}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor={`goal-date-${goal.id}`}>Target Date:</label>
                          <input
                            type="date"
                            id={`goal-date-${goal.id}`}
                            value={goal.due_date || ''}
                            onChange={(e) => updateGoal(pillar.id, goal.id, { due_date: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor={`goal-progress-${goal.id}`}>
                          Progress: {goal.progress}%
                        </label>
                        <input
                          type="range"
                          id={`goal-progress-${goal.id}`}
                          min="0"
                          max="100"
                          value={goal.progress}
                          onChange={(e) => updateGoal(pillar.id, goal.id, { progress: parseInt(e.target.value) })}
                        />
                      </div>
                      
                      <div className="targets-section">
                        <h5>Targets</h5>
                        
                        {goal.targets.length === 0 && (
                          <p className="no-targets">No targets defined for this goal.</p>
                        )}
                        
                        {goal.targets.map((target, index) => (
                          <div key={index} className="target-item">
                            <div className="target-input">
                              <input
                                type="text"
                                value={target.name}
                                onChange={(e) => updateTarget(pillar.id, goal.id, index, { name: e.target.value })}
                                placeholder="Enter target description"
                              />
                              
                              <button
                                type="button"
                                className="btn-remove-target"
                                onClick={() => removeTarget(pillar.id, goal.id, index)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          className="btn-add-target"
                          onClick={() => addTarget(pillar.id, goal.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Add Target
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="goal-view">
                      <p className="goal-description">{goal.description}</p>
                      
                      <div className="goal-metadata">
                        <div className="metadata-item">
                          <span className="metadata-label">Category:</span>
                          <span className="metadata-value category-tag">{
                            goalCategories.find(cat => cat.value === goal.category)?.label || goal.category
                          }</span>
                        </div>
                        
                        {goal.due_date && (
                          <div className="metadata-item">
                            <span className="metadata-label">Target Date:</span>
                            <span className="metadata-value">
                              {new Date(goal.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="goal-progress">
                        <div className="progress-label">
                          <span>Progress:</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${goal.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {goal.targets.length > 0 && (
                        <div className="goal-targets">
                          <h5>Targets:</h5>
                          <ul className="targets-list">
                            {goal.targets.map((target, index) => (
                              <li key={index} className="target-item">
                                {target.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                className="btn-add-goal"
                onClick={() => addGoal(pillar.id)}
                disabled={isProcessing}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Goal to {pillar.name}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={prevStep}
          disabled={isProcessing}
        >
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={saveGoals}
          disabled={isProcessing}
        >
          {isProcessing ? 'Saving...' : 'Save Goals and Continue'}
        </button>
      </div>
    </div>
  );
};

export default GoalExtraction;