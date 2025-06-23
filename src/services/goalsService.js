// src/services/goalsService.js
import axios from 'axios';

// Update this to use the exact base URL your backend dev provided
const API_URL = 'https://fetching-api-866853235757.europe-west3.run.app';

/**
 * Save extracted goals to the backend
 * @param {string} auth0Id - User's Auth0 ID
 * @param {object} extractedGoals - The goals object from onboarding
 * @returns {Promise} - API response data
 */
export const saveExtractedGoals = async (auth0Id, extractedGoals) => {
  try {
    // Using the exact endpoint your backend dev created
    const response = await axios.post(`${API_URL}/save-goals`, {
      auth0_id: auth0Id,
      goals: extractedGoals
    });
    return response.data;
  } catch (error) {
    console.error('Failed to save goals:', error);
    throw error;
  }
};

/**
 * Fetch goals for a specific user
 * @param {string} auth0Id - User's Auth0 ID
 * @returns {Promise} - API response with goals data
 */
export const fetchUserGoals = async (auth0Id) => {
  try {
    // Using the exact endpoint your backend dev created
    const response = await axios.get(`${API_URL}/goals/${auth0Id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    throw error;
  }
};

/**
 * Update the progress of a specific goal
 * @param {string} goalId - ID of the goal to update
 * @param {number} progress - New progress value (0-100)
 * @param {string} auth0Id - User's Auth0 ID
 * @returns {Promise} - API response data
 */
export const updateGoalProgress = async (goalId, progress, auth0Id) => {
  try {
    // Using the exact endpoint your backend dev created
    const response = await axios.put(`${API_URL}/goals/${goalId}/progress`, {
      auth0_id: auth0Id,
      progress
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update goal progress:', error);
    throw error;
  }
};

/**
 * Generate a consistent hash from an email
 * @param {string} email - User's email
 * @returns {string} - Hex string hash
 */
export const generateEmailHash = (email) => {
  const str = email.toLowerCase(); // Normalize email to lowercase
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16); // Convert to hex string and ensure positive
};

export default {
  saveExtractedGoals,
  fetchUserGoals,
  updateGoalProgress,
  generateEmailHash
};