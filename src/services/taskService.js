// src/services/taskService.js
import axios from 'axios';
import { generateEmailHash } from './goalsService';

const API_URL = 'https://fetching-api-866853235757.europe-west3.run.app';

/**
 * Fetch all tasks for a user
 */
export const fetchUserTasks = async (auth0Id) => {
  try {
    const response = await axios.get(`${API_URL}/tasks/${auth0Id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

/**
 * Create a new task
 */
export const createTask = async (auth0Id, taskData) => {
  try {
    const response = await axios.post(`${API_URL}/tasks/${auth0Id}`, taskData);
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (auth0Id, taskId, taskData) => {
  try {
    const response = await axios.put(`${API_URL}/tasks/${auth0Id}/${taskId}`, taskData);
    return response.data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

/**
 * Update a task's status
 */
export const updateTaskStatus = async (auth0Id, taskId, newStatus) => {
  try {
    const response = await axios.patch(
      `${API_URL}/tasks/${auth0Id}/${taskId}/status`, 
      { status: newStatus }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (auth0Id, taskId) => {
  try {
    const response = await axios.delete(`${API_URL}/tasks/${auth0Id}/${taskId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

/**
 * Add an assignee to a task
 */
export const addAssignee = async (auth0Id, taskId, assigneeName, assigneeEmail = null) => {
  try {
    const payload = { assigneeName };
    if (assigneeEmail) {
      payload.assigneeEmail = assigneeEmail;
    }
    
    const response = await axios.post(
      `${API_URL}/tasks/${auth0Id}/${taskId}/assignees`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error adding assignee:', error);
    throw error;
  }
};

/**
 * Remove an assignee from a task
 */
export const removeAssignee = async (auth0Id, taskId, assigneeName) => {
  try {
    const response = await axios.delete(
      `${API_URL}/tasks/${auth0Id}/${taskId}/assignees/${encodeURIComponent(assigneeName)}`
    );
    return response.data;
  } catch (error) {
    console.error('Error removing assignee:', error);
    throw error;
  }
};

/**
 * Generate auth0 ID from email
 */
export const getAuth0Id = (email) => {
  const userIdentifier = generateEmailHash(email);
  return `auth0_${userIdentifier}`;
};