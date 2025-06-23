// src/context/TaskGoalContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchUserGoals, generateEmailHash } from '../services/goalsService';

// Create service file for task operations
const API_URL = 'https://fetching-api-866853235757.europe-west3.run.app';

const fetchUserTasks = async (auth0Id) => {
  try {
    console.log(`Fetching tasks for user ${auth0Id}`);
    const response = await fetch(`${API_URL}/tasks/${auth0Id}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.length} tasks`);
    return data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

const createTask = async (auth0Id, taskData) => {
  try {
    // Ensure all required fields are present
    if (!taskData.title) {
      throw new Error('Task title is required');
    }
    if (!taskData.status) {
      throw new Error('Task status is required');
    }
    if (!taskData.category) {
      throw new Error('Task category is required');
    }
    
    console.log(`Creating task for user ${auth0Id} with data:`, JSON.stringify(taskData, null, 2));
    
    const response = await fetch(`${API_URL}/tasks/${auth0Id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    
    // Better error handling with response text
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      
      try {
        // Try to parse as JSON if possible
        const errorJson = JSON.parse(errorText);
        throw new Error(`API error (${response.status}): ${errorJson.error || errorJson.message || errorText}`);
      } catch (e) {
        // If parsing fails, use text
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('Task created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

const updateTask = async (auth0Id, taskId, taskData) => {
  try {
    console.log(`Updating task ${taskId} for user ${auth0Id} with data:`, JSON.stringify(taskData, null, 2));
    
    const response = await fetch(`${API_URL}/tasks/${auth0Id}/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Task updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

const updateTaskStatus = async (auth0Id, taskId, newStatus) => {
  try {
    console.log(`Updating task ${taskId} status to ${newStatus} for user ${auth0Id}`);
    
    const response = await fetch(`${API_URL}/tasks/${auth0Id}/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Task status updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

const deleteTask = async (auth0Id, taskId) => {
  try {
    console.log(`Deleting task ${taskId} for user ${auth0Id}`);
    
    const response = await fetch(`${API_URL}/tasks/${auth0Id}/${taskId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Task deleted successfully:', data);
    return data;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

const addAssignee = async (auth0Id, taskId, assigneeName, assigneeEmail = null) => {
  try {
    const payload = { assigneeName };
    if (assigneeEmail) payload.assigneeEmail = assigneeEmail;
    
    console.log(`Adding assignee "${assigneeName}" to task ${taskId} for user ${auth0Id}`);
    
    const response = await fetch(`${API_URL}/tasks/${auth0Id}/${taskId}/assignees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Assignee added successfully:', data);
    return data;
  } catch (error) {
    console.error('Error adding assignee:', error);
    throw error;
  }
};

const removeAssignee = async (auth0Id, taskId, assigneeName) => {
  try {
    console.log(`Removing assignee "${assigneeName}" from task ${taskId} for user ${auth0Id}`);
    
    const response = await fetch(`${API_URL}/tasks/${auth0Id}/${taskId}/assignees/${encodeURIComponent(assigneeName)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Assignee removed successfully:', data);
    return data;
  } catch (error) {
    console.error('Error removing assignee:', error);
    throw error;
  }
};

// Create the context with default values to avoid destructuring issues
const TaskGoalContext = createContext({
  goals: {},
  tasks: [],
  loading: false,
  error: null,
  auth0Id: null,
  registerGoals: () => {},
  getTasksForGoal: () => [],
  createTaskFromGoal: async () => {},
  createTask: async () => {},
  updateTask: async () => {},
  updateTaskStatus: async () => {},
  deleteTask: async () => {},
  addTaskAssignee: async () => {},
  removeTaskAssignee: async () => {},
  refreshData: async () => {}
});

export const TaskGoalProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth0();
  const [goals, setGoals] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auth0Id, setAuth0Id] = useState(null);

  // Set auth0Id when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      const userIdentifier = generateEmailHash(user.email);
      const generatedId = `auth0_${userIdentifier}`;
      setAuth0Id(generatedId);
      console.log('Set auth0_id:', generatedId);
    }
  }, [isAuthenticated, user]);

  // Helper to convert pillar ID to friendly name
  const getPillarName = useCallback((pillarId) => {
    const pillarMapping = {
      'env': 'environment',
      'soc': 'social',
      'gov': 'governance'
    };
    return pillarMapping[pillarId] || pillarId;
  }, []);

  // Process goals into a flat structure for easier tracking
  const processFlatGoalsStructure = useCallback((goalsObject) => {
    const flatGoals = {};
    
    if (!goalsObject || !goalsObject.pillars) return flatGoals;
    
    goalsObject.pillars.forEach(pillar => {
      if (!Array.isArray(pillar.goals)) return;
      
      pillar.goals.forEach(goal => {
        if (!goal || !goal.id) return;
        
        flatGoals[goal.id] = {
          id: goal.id,
          title: goal.title || 'Unnamed Goal',
          description: goal.description || '',
          category: goal.category || '',
          pillar: getPillarName(pillar.id),
          pillarId: pillar.id,
          progress: goal.progress || 0,
          dueDate: goal.due_date ? new Date(goal.due_date) : new Date()
        };
      });
    });
    
    return flatGoals;
  }, [getPillarName]);

  // Load data function with useCallback
  const loadData = useCallback(async () => {
    if (!auth0Id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading data for user:', auth0Id);
      
      // Fetch goals and tasks in parallel
      const [goalsData, tasksData] = await Promise.all([
        fetchUserGoals(auth0Id).catch(err => {
          console.error("Error fetching goals:", err);
          return { pillars: [] };
        }),
        fetchUserTasks(auth0Id).catch(err => {
          console.error("Error fetching tasks:", err);
          return [];
        })
      ]);
      
      // Process goals
      if (goalsData && goalsData.pillars) {
        const flatGoals = processFlatGoalsStructure(goalsData);
        setGoals(flatGoals);
        console.log(`Processed ${Object.keys(flatGoals).length} goals`);
      }
      
      // Set tasks
      setTasks(tasksData || []);
      console.log(`Loaded ${tasksData?.length || 0} tasks`);
      
    } catch (err) {
      console.error("Error loading data:", err);
      setError(`Failed to load data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [auth0Id, processFlatGoalsStructure]);

  // Load data when authenticated
  useEffect(() => {
    if (auth0Id) {
      loadData();
    }
  }, [auth0Id, loadData]);

  // Register updated goals with context
  const registerGoals = useCallback((goalsData) => {
    setGoals(goalsData);
    console.log(`Registered ${Object.keys(goalsData).length} goals`);
  }, []);

  // Get tasks associated with a goal
  const getTasksForGoal = useCallback((goalId) => {
    return tasks.filter(task => task.linkedGoalId === goalId);
  }, [tasks]);

  // Create a task from a goal - FIXED to include all required fields
  const createTaskFromGoal = useCallback(async (goalId, title, category, dueDate) => {
    if (!auth0Id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const goal = goals[goalId];
      
      if (!goal) {
        throw new Error(`Goal with ID ${goalId} not found`);
      }
      
      const newTask = {
        title: title || `Task for ${goal.title}`,
        description: `Task created from goal: ${goal.title}`,
        status: "TODO", // Required field
        category: category || "ENERGY_EFFICIENCY", // Required field
        assignees: [],
        dueDate: dueDate instanceof Date 
          ? dueDate.toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0],
        priority: "MEDIUM",
        linkedGoalId: goalId
      };
      
      console.log('Creating task from goal with data:', newTask);
      
      // Save using API
      const savedTask = await createTask(auth0Id, newTask);
      
      // Update local state
      setTasks(prevTasks => [...prevTasks, savedTask]);
      
      return savedTask;
      
    } catch (error) {
      console.error('Error creating task from goal:', error);
      throw error;
    }
  }, [auth0Id, goals]);

  // Create a new task - FIXED to include all required fields
  const createNewTask = useCallback(async (taskData) => {
    if (!auth0Id) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Ensure required fields are included
      const taskWithRequiredFields = {
        title: taskData.title || 'New Task',
        status: taskData.status || 'TODO', // Required field
        category: taskData.category || 'ENERGY_EFFICIENCY', // Required field
        ...taskData, // Keep all other fields from the original data
      };
      
      console.log('Creating new task with data:', taskWithRequiredFields);
      
      const savedTask = await createTask(auth0Id, taskWithRequiredFields);
      
      // Update local state
      setTasks(prevTasks => [...prevTasks, savedTask]);
      
      return savedTask;
    } catch (error) {
      console.error('Error creating new task:', error);
      throw error;
    }
  }, [auth0Id]);

  // Update a task
  const updateExistingTask = useCallback(async (taskId, taskData) => {
    if (!auth0Id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const updatedTask = await updateTask(auth0Id, taskId, taskData);
      
      // Update local state
      setTasks(prevTasks => prevTasks.map(task => 
        task.id === taskId ? updatedTask : task
      ));
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }, [auth0Id]);

  // Update task status
  const updateTaskStatusWithGoalUpdate = useCallback(async (taskId, newStatus) => {
    if (!auth0Id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const result = await updateTaskStatus(auth0Id, taskId, newStatus);
      
      // If the goal was updated, refresh all data
      if (result.goalUpdated) {
        await loadData();
      } else {
        // Otherwise just update the task locally
        setTasks(prevTasks => prevTasks.map(task => 
          task.id === taskId ? {...task, status: newStatus} : task
        ));
      }
      
      return result;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }, [auth0Id, loadData]);

  // Delete a task
  const deleteExistingTask = useCallback(async (taskId) => {
    if (!auth0Id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const result = await deleteTask(auth0Id, taskId);
      
      // If the goal was updated, refresh all data
      if (result.goalUpdated) {
        await loadData();
      } else {
        // Otherwise just remove the task locally
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }, [auth0Id, loadData]);

  // Add assignee to task
  const addTaskAssignee = useCallback(async (taskId, assigneeName, assigneeEmail) => {
    if (!auth0Id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const result = await addAssignee(auth0Id, taskId, assigneeName, assigneeEmail);
      
      // Update local task
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
          const updatedAssignees = task.assignees ? [...task.assignees] : [];
          if (!updatedAssignees.includes(assigneeName)) {
            updatedAssignees.push(assigneeName);
          }
          return { ...task, assignees: updatedAssignees };
        }
        return task;
      }));
      
      return result;
    } catch (error) {
      console.error('Error adding assignee:', error);
      throw error;
    }
  }, [auth0Id]);

  // Remove assignee from task
  const removeTaskAssignee = useCallback(async (taskId, assigneeName) => {
    if (!auth0Id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const result = await removeAssignee(auth0Id, taskId, assigneeName);
      
      // Update local task
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
          const updatedAssignees = task.assignees 
            ? task.assignees.filter(name => name !== assigneeName) 
            : [];
          return { ...task, assignees: updatedAssignees };
        }
        return task;
      }));
      
      return result;
    } catch (error) {
      console.error('Error removing assignee:', error);
      throw error;
    }
  }, [auth0Id]);

  const value = {
    goals,
    tasks,
    loading,
    error,
    auth0Id,
    registerGoals,
    getTasksForGoal,
    createTaskFromGoal,
    createTask: createNewTask,
    updateTask: updateExistingTask,
    updateTaskStatus: updateTaskStatusWithGoalUpdate,
    deleteTask: deleteExistingTask,
    addTaskAssignee,
    removeTaskAssignee,
    refreshData: loadData
  };

  return (
    <TaskGoalContext.Provider value={value}>
      {children}
    </TaskGoalContext.Provider>
  );
};

export const useTaskGoalIntegration = () => {
  const context = useContext(TaskGoalContext);
  if (context === undefined) {
    console.error('useTaskGoalIntegration must be used within a TaskGoalProvider');
  }
  return context;
};