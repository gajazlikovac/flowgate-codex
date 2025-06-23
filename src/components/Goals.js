// src/components/Goals.js
import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTaskGoalIntegration } from '../context/TaskGoalContext';
import { fetchUserGoals, generateEmailHash, saveExtractedGoals } from '../services/goalsService';
import { useAuth0 } from '@auth0/auth0-react';

const Goals = () => {
  // Use the task-goal integration
  const { 
    createTaskFromGoal, 
    registerGoals,
    getTasksForGoal,
    goals: contextGoals,
    loading: contextLoading,
    refreshData
  } = useTaskGoalIntegration();
  
  const { user, isAuthenticated } = useAuth0();
  
  // State management
  const [activeTab, setActiveTab] = useState("environment");
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [goalsData, setGoalsData] = useState({});
  const [equinixGoals, setEquinixGoals] = useState({
    environment: [],
    social: [],
    governance: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [goalUpdated, setGoalUpdated] = useState(false);
  const [taskCreationSuccess, setTaskCreationSuccess] = useState(false);
  const [taskCreationMessage, setTaskCreationMessage] = useState('');
  
  // Add Goal form state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalData, setNewGoalData] = useState({
    title: '',
    description: '',
    category: 'energy', 
    due_date: new Date().toISOString().split('T')[0],
    progress: 0,
    targets: []
  });
  const [savingGoal, setSavingGoal] = useState(false);
  
  // SIMULATION FLAG - Set to true to see random progress values
  // Set to false to use actual database values (all 0 currently)
  const SIMULATE_PROGRESS = true;

  // Category mapping for task creation
  const CategoryMap = {
    "env-1": "ENERGY_EFFICIENCY",  
    "env-2": "RENEWABLE_ENERGY",
    "env-3": "ENERGY_EFFICIENCY",
    "soc-1": "ISO_STANDARDS",
    "gov-1": "ISO_STANDARDS"
  };
  
  // DEEP DEBUGGING FUNCTION
  const deepInspectGoalData = (data) => {
    console.log('======== DEEP GOAL DATA INSPECTION ========');
    
    if (!data || !data.pillars) {
      console.error('❌ No valid goal data structure found');
      return false;
    }
    
    console.log(`📊 Found ${data.pillars.length} pillars in the data`);
    console.log('🔍 Raw data structure:', JSON.stringify(data).substring(0, 200) + '...');
    
    // First, let's examine the structure of a single goal to understand all available fields
    let sampleGoal = null;
    for (const pillar of data.pillars) {
      if (pillar.goals && pillar.goals.length > 0) {
        sampleGoal = pillar.goals[0];
        break;
      }
    }
    
    if (sampleGoal) {
      console.log('📋 Sample goal structure:');
      console.log(JSON.stringify(sampleGoal, null, 2));
      console.log('Available fields:', Object.keys(sampleGoal).join(', '));
    }
    
    // Check if descriptions are properly populated
    let goalsWithEmptyDescriptions = 0;
    let goalsWithTruncatedDescriptions = 0;
    let totalGoals = 0;
    
    // Count goals by category to verify distribution
    const categoryCounts = {};
    
    data.pillars.forEach(pillar => {
      console.log(`\n🏛️ Pillar: ${pillar.id} (${pillar.goals?.length || 0} goals)`);
      
      if (!pillar.goals || !Array.isArray(pillar.goals)) {
        console.warn(`  ⚠️ No goals found for pillar ${pillar.id}`);
        return;
      }
      
      pillar.goals.forEach((goal, index) => {
        totalGoals++;
        
        // Track categories
        const category = goal.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        
        // Check descriptions
        if (!goal.description) {
          goalsWithEmptyDescriptions++;
        } else if (goal.description.length < 10) {
          goalsWithTruncatedDescriptions++;
        }
        
        // Log detailed info for first 3 goals in each pillar
        if (index < 3) {
          console.log(`  Goal ${index+1}: "${goal.title || 'Untitled'}"`);
          console.log(`    ID: ${goal.id}`);
          console.log(`    Category: ${goal.category || 'None'}`);
          console.log(`    Description: "${goal.description || 'No description'}"`);
          console.log(`    Due date: ${goal.due_date || 'No due date'}`);
          console.log(`    Progress: ${goal.progress || 0}%`);
          
          // Check for targets/sub-goals
          if (goal.targets && goal.targets.length > 0) {
            console.log(`    Has ${goal.targets.length} targets`);
          } else {
            console.log(`    No targets defined`);
          }
        }
      });
    });
    
    // Summary statistics
    console.log('\n📊 Data Quality Summary:');
    console.log(`  Total goals: ${totalGoals}`);
    console.log(`  Goals with empty descriptions: ${goalsWithEmptyDescriptions} (${Math.round(goalsWithEmptyDescriptions/totalGoals*100)}%)`);
    console.log(`  Goals with very short descriptions: ${goalsWithTruncatedDescriptions} (${Math.round(goalsWithTruncatedDescriptions/totalGoals*100)}%)`);
    
    console.log('\n📊 Category Distribution:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} goals (${Math.round(count/totalGoals*100)}%)`);
    });
    
    console.log('======== END DEEP INSPECTION ========');
    
    // Optionally simulate progress values
    if (SIMULATE_PROGRESS) {
      console.log('🚀 SIMULATING PROGRESS VALUES FOR VISUALIZATION');
      
      data.pillars.forEach(pillar => {
        if (pillar.goals && Array.isArray(pillar.goals)) {
          pillar.goals.forEach(goal => {
            const originalProgress = goal.progress || 0;
            // Assign random progress between 10-90% for testing
            goal.progress = Math.floor(Math.random() * 80) + 10;
            console.log(`  Goal ${goal.id}: progress ${originalProgress}% → ${goal.progress}% (simulated)`);
          });
        }
      });
    }
    
    return data;
  };
  
  // Memoize the registerGoals function to prevent unnecessary re-renders
  const memoizedRegisterGoals = useCallback((goals) => {
    if (registerGoals) {
      registerGoals(goals);
    }
  }, [registerGoals]);
  
  // Create detailed metrics structure for visualization
  const createDetailedMetrics = (goal, progressValue = 0) => {
    if (!goal) return { description: 'No data', metrics: [], yearlyProgress: [] };
    
    const currentYear = new Date().getFullYear();
    const targetYear = goal.due_date ? new Date(goal.due_date).getFullYear() : currentYear + 2;
    
    // Ensure progress is a number
    const progress = typeof progressValue === 'number' ? progressValue : 
                     (typeof goal.progress === 'number' ? goal.progress : 0);
    
    // Create basic metrics
    return {
      description: goal.description || `Target: ${goal.title || 'Unnamed Goal'}`,
      metrics: [
        { 
          name: goal.category ? (goal.category.charAt(0).toUpperCase() + goal.category.slice(1)) : 'General', 
          unit: "%", 
          values: { [currentYear]: progress },
          target: 100
        }
      ],
      yearlyProgress: [
        { year: currentYear - 1, value: Math.max(0, progress - 10) },
        { year: currentYear, value: progress },
        { year: targetYear, value: 100, isTarget: true }
      ]
    };
  };
  
  // Transform the API goals data to match the component structure
  const transformGoalsData = useCallback((apiGoals) => {
    console.log("Starting goals transformation");
    const result = {
      environment: [],
      social: [],
      governance: []
    };
    
    // Map pillars from API to local format
    const pillarMapping = {
      'env': 'environment',
      'soc': 'social',
      'gov': 'governance'
    };
    
    // Safely handle missing data
    if (!apiGoals || !apiGoals.pillars) {
      console.warn("Invalid API goals data structure");
      return result;
    }
    
    // Group goals by category for each pillar
    apiGoals.pillars.forEach(pillar => {
      if (!pillar || !pillar.id) {
        console.warn("Found invalid pillar without ID");
        return;
      }
      
      const localPillarName = pillarMapping[pillar.id] || pillar.id;
      console.log(`Processing pillar: ${pillar.id} -> ${localPillarName}`);
      
      // Group goals by category
      const categorizedGoals = {};
      
      // Safely handle missing goals array
      if (!pillar.goals || !Array.isArray(pillar.goals)) {
        console.warn(`No goals found for pillar ${pillar.id}`);
        return;
      }
      
      console.log(`Pillar ${pillar.id} has ${pillar.goals.length} goals`);
      
      pillar.goals.forEach(goal => {
        if (!goal) {
          console.warn(`Found null/undefined goal in pillar ${pillar.id}`);
          return;
        }
        
        // Default values for missing fields
        const category = goal.category || pillar.id;
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        const categoryKey = `${pillar.id}-${category}`;
        
        if (!categorizedGoals[categoryKey]) {
          categorizedGoals[categoryKey] = {
            id: categoryKey,
            category: categoryName,
            description: `${categoryName} goals for sustainability`,
            targets: []
          };
        }
        
        // Ensure progress is a number
        let progressValue = 0;
        if (goal.progress !== undefined && goal.progress !== null) {
          progressValue = parseInt(goal.progress, 10);
          if (isNaN(progressValue)) progressValue = 0;
        }
        
        // Create target object from goal, ensuring description is included
        const targetObj = {
          id: goal.id || `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: goal.title || 'Unnamed Goal',
          description: goal.description || '', // Make sure to capture the description
          status: progressValue >= 100 ? 'Achieved' : progressValue > 0 ? 'In progress' : 'Not started',
          dueDate: goal.due_date ? new Date(goal.due_date) : new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          progress: progressValue,
          detailedMetrics: createDetailedMetrics(goal, progressValue)
        };
        
        console.log(`- Goal ${goal.id}: "${goal.title}" with progress: ${progressValue}%`);
        if (goal.description) {
          console.log(`  Description: "${goal.description?.substring(0, 50)}${goal.description?.length > 50 ? '...' : ''}"`);
        }
        
        categorizedGoals[categoryKey].targets.push(targetObj);
      });
      
      // Add categorized goals to result
      result[localPillarName] = Object.values(categorizedGoals);
      
      // Calculate total targets for debugging
      const totalTargets = result[localPillarName].reduce((acc, category) => 
        acc + (category.targets ? category.targets.length : 0), 0);
      
      console.log(`${localPillarName}: ${result[localPillarName].length} categories with ${totalTargets} total targets`);
    });
    
    return result;
  }, []);
  
  // Process goals into a flat structure for easier tracking
  const processFlatGoalsStructure = useCallback((goalsObject) => {
    const flatGoals = {};
    
    Object.keys(goalsObject).forEach(pillar => {
      if (!Array.isArray(goalsObject[pillar])) return;
      
      goalsObject[pillar].forEach(goalCategory => {
        if (!goalCategory || !Array.isArray(goalCategory.targets)) return;
        
        goalCategory.targets.forEach(target => {
          if (!target || !target.id) return;
          
          flatGoals[target.id] = {
            id: target.id,
            name: target.name || 'Unnamed Target',
            description: target.description || '',  // Include description in flat structure
            categoryName: goalCategory.category || 'Uncategorized',
            categoryId: goalCategory.id || 'unknown',
            pillar,
            status: target.status || 'Not started',
            progress: target.progress || 0,
            dueDate: target.dueDate || new Date(),
            detailedMetrics: target.detailedMetrics || createDetailedMetrics({})
          };
        });
      });
    });
    
    return flatGoals;
  }, []);
  
  // NEW: Check for goal updates from tasks
  useEffect(() => {
    // If contextGoals are available and we have local goalsData, check for differences
    if (contextGoals && Object.keys(contextGoals).length > 0 && 
        goalsData && Object.keys(goalsData).length > 0) {
      let progressChanged = false;
      
      // Check if any goal progress has changed
      Object.keys(contextGoals).forEach(goalId => {
        if (goalsData[goalId] && 
            contextGoals[goalId].progress !== goalsData[goalId].progress) {
          progressChanged = true;
        }
      });
      
      if (progressChanged) {
        console.log('Goal progress changes detected, refreshing data');
        setGoalUpdated(true);
      }
    }
  }, [contextGoals, goalsData]);
  
  // Load goals from the API
  useEffect(() => {
    // Only run this effect if we haven't attempted to fetch yet,
    // if authentication state changes, or if a goal was updated
    if ((fetchAttempted && isAuthenticated && !goalUpdated)) return;
    
    const loadGoals = async () => {
      if (!isAuthenticated || !user?.email) {
        setLoading(false); // Set loading to false even when not authenticated
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setFetchAttempted(true); // Mark that we've attempted a fetch
        setGoalUpdated(false);   // Reset goal updated flag
        
        // Generate auth0 ID
        const userIdentifier = generateEmailHash(user.email);
        const auth0Id = `auth0_${userIdentifier}`;
        
        console.log("Using auth0_id for fetching goals:", auth0Id);
        
        // Add timeout to prevent rapid re-fetching
        const apiGoals = await Promise.race([
          fetchUserGoals(auth0Id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )
        ]);
        
        // Deep inspect the data to see what's actually coming from the API
        const processedGoals = deepInspectGoalData(apiGoals);
        
        if (!processedGoals || !processedGoals.pillars) {
          throw new Error("Invalid goals data format");
        }
        
        if (processedGoals.pillars.length === 0) {
          // Handle empty goals scenario without throwing an error
          console.log("No goals found in the database");
          setEquinixGoals({
            environment: [],
            social: [],
            governance: []
          });
          setGoalsData({});
          setLoading(false);
          return;
        }
        
        // Transform API data to match component structure
        const transformedGoals = transformGoalsData(processedGoals);
        setEquinixGoals(transformedGoals);
        
        // Process flat goal structure for task integration
        const flatGoals = processFlatGoalsStructure(transformedGoals);
        setGoalsData(flatGoals);
        
        // Register goals with the integration context
        memoizedRegisterGoals(flatGoals);
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading goals:", err);
        setError(`Failed to load goals: ${err.message || 'Unknown error'}`);
        setLoading(false);
        
        // If contextGoals are available, use them as fallback
        if (contextGoals && Object.keys(contextGoals).length > 0) {
          console.log('Using goals from context as fallback');
          setGoalsData(contextGoals);

          // Reconstruct equinixGoals structure from contextGoals
          const fallbackEquinixGoals = {
            environment: [],
            social: [],
            governance: []
          };
          
          // Group by pillar and category
          const categorizedByPillar = {
            environment: {},
            social: {},
            governance: {}
          };
          
          // Group goals by category
          Object.values(contextGoals).forEach(goal => {
            const pillar = goal.pillar || 'environment';
            const categoryId = goal.categoryId || 'unknown';
            const category = goal.categoryName || 'Unknown';
            
            if (!categorizedByPillar[pillar][categoryId]) {
              categorizedByPillar[pillar][categoryId] = {
                id: categoryId,
                category: category,
                description: `${category} goals for sustainability`,
                targets: []
              };
            }
            
            // Add as target
            categorizedByPillar[pillar][categoryId].targets.push({
              id: goal.id,
              name: goal.name,
              description: goal.description,
              status: goal.status || 'Not started',
              dueDate: goal.dueDate || new Date(),
              progress: goal.progress || 0,
              detailedMetrics: goal.detailedMetrics || createDetailedMetrics({})
            });
          });
          
          // Convert to array structure
          Object.keys(categorizedByPillar).forEach(pillar => {
            fallbackEquinixGoals[pillar] = Object.values(categorizedByPillar[pillar]);
          });
          
          setEquinixGoals(fallbackEquinixGoals);
        }
      }
    };
    
    loadGoals();
  }, [
    isAuthenticated, 
    user, 
    memoizedRegisterGoals, 
    fetchAttempted, 
    transformGoalsData, 
    processFlatGoalsStructure,
    goalUpdated,
    contextGoals
  ]);
  
  // Function to retry loading goals - Enhanced to use context refresh
  const handleRetryLoading = useCallback(() => {
    setFetchAttempted(false); // Reset fetch attempted flag to allow the effect to run again
    
    // Also try refreshing via the context
    if (refreshData) {
      refreshData();
    }
  }, [refreshData]);
  
  // Function to add a new goal
  const handleAddNewGoal = async () => {
    if (!isAuthenticated || !user?.email) {
      alert('You must be logged in to add goals');
      return;
    }
    
    if (!newGoalData.title) {
      alert('Goal title is required');
      return;
    }
    
    try {
      setSavingGoal(true);
      
      // Generate auth0 ID
      const userIdentifier = generateEmailHash(user.email);
      const auth0Id = `auth0_${userIdentifier}`;
      
      // Get existing goals
      let currentGoals;
      try {
        currentGoals = await fetchUserGoals(auth0Id);
        
        // Initialize if needed
        if (!currentGoals || !currentGoals.pillars) {
          currentGoals = {
            user_id: auth0Id,
            pillars: [
              { id: 'env', goals: [] },
              { id: 'soc', goals: [] },
              { id: 'gov', goals: [] }
            ]
          };
        }
      } catch (error) {
        console.error('Error fetching current goals:', error);
        // Initialize goals if none exist
        currentGoals = {
          user_id: auth0Id,
          pillars: [
            { id: 'env', goals: [] },
            { id: 'soc', goals: [] },
            { id: 'gov', goals: [] }
          ]
        };
      }
      
      // Find the appropriate pillar
      const pillarId = activeTab === 'environment' ? 'env' : 
                      activeTab === 'social' ? 'soc' : 'gov';
      
      let pillar = currentGoals.pillars.find(p => p.id === pillarId);
      
      if (!pillar) {
        // Create pillar if it doesn't exist
        pillar = { id: pillarId, goals: [] };
        currentGoals.pillars.push(pillar);
      }
      
      if (!Array.isArray(pillar.goals)) {
        pillar.goals = [];
      }
      
      // Create new goal with unique ID
      const newGoal = {
        id: `${pillarId}-${Date.now()}`,
        pillar_id: pillarId,
        title: newGoalData.title,
        description: newGoalData.description,
        category: newGoalData.category,
        progress: newGoalData.progress,
        due_date: newGoalData.due_date,
        targets: newGoalData.targets.map((target, index) => ({
          id: `${pillarId}-target-${Date.now()}-${index}`,
          name: target.name,
          status: 'Not started',
          progress: 0
        }))
      };
      
      // Add new goal to the pillar
      pillar.goals.push(newGoal);
      
      // Save updated goals
      await saveExtractedGoals(auth0Id, currentGoals);
      
      // Refresh goals data
      const updatedGoals = await fetchUserGoals(auth0Id);
      
      // Deep inspect updated goals
      const processedGoals = deepInspectGoalData(updatedGoals);
      
      const transformedGoals = transformGoalsData(processedGoals);
      setEquinixGoals(transformedGoals);
      
      // Reset form
      setNewGoalData({
        title: '',
        description: '',
        category: 'energy',
        due_date: new Date().toISOString().split('T')[0],
        progress: 0,
        targets: []
      });
      
      setIsAddingGoal(false);
      
      // Recalculate flat goals structure
      const flatGoals = processFlatGoalsStructure(transformedGoals);
      setGoalsData(flatGoals);
      
      // Register updated goals
      memoizedRegisterGoals(flatGoals);
      
    } catch (error) {
      console.error('Failed to add goal:', error);
      alert('Failed to save new goal. Please try again.');
    } finally {
      setSavingGoal(false);
    }
  };
  
  // Function to add a target to the new goal
  const addTargetToNewGoal = () => {
    setNewGoalData({
      ...newGoalData,
      targets: [...newGoalData.targets, { name: '', status: 'Not started', progress: 0 }]
    });
  };
  
  // Function to update a target
  const updateNewGoalTarget = (index, value) => {
    const updatedTargets = [...newGoalData.targets];
    updatedTargets[index].name = value;
    
    setNewGoalData({
      ...newGoalData,
      targets: updatedTargets
    });
  };
  
  // Function to remove a target
  const removeTargetFromNewGoal = (index) => {
    const updatedTargets = [...newGoalData.targets];
    updatedTargets.splice(index, 1);
    
    setNewGoalData({
      ...newGoalData,
      targets: updatedTargets
    });
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'No due date';
    try {
      return format(date, 'MMM dd, yyyy');
    } catch (e) {
      console.error("Date formatting error:", e, date);
      return 'Invalid date';
    }
  };
  
  // Calculate overall progress for a pillar
  const calculatePillarProgress = (pillar) => {
    const goals = equinixGoals[pillar];
    let totalTargets = 0;
    let totalProgress = 0;
    
    if (!Array.isArray(goals)) return 0;
    
    goals.forEach(goal => {
      if (!goal || !Array.isArray(goal.targets)) return;
      
      goal.targets.forEach(target => {
        totalTargets++;
        totalProgress += target.progress || 0;
      });
    });
    
    return totalTargets > 0 ? Math.round(totalProgress / totalTargets) : 0;
  };
  
  // Enhanced handle create task function with better feedback
  const handleCreateTaskForGoal = async (goalId) => {
    if (!goalsData[goalId] || !createTaskFromGoal) {
      console.warn('Cannot create task: invalid goal ID or missing createTaskFromGoal function');
      setTaskCreationMessage('Cannot create task: invalid goal or missing function');
      setTaskCreationSuccess(false);
      setTimeout(() => setTaskCreationSuccess(false), 3000);
      return;
    }
    
    try {
      const goal = goalsData[goalId];
      const categoryForTask = CategoryMap[goal.categoryId] || "ENERGY_EFFICIENCY";
      
      // Create a task tied to this goal (now with awaited response)
      const createdTask = await createTaskFromGoal(
        goalId, 
        goal.name, 
        categoryForTask, 
        goal.dueDate
      );
      
      // Set success message and show it
      setTaskCreationMessage(`Task created for goal: ${goal.name}. Check the Task Management page to see it and assign team members.`);
      setTaskCreationSuccess(true);
      
      // Hide after 5 seconds
      setTimeout(() => setTaskCreationSuccess(false), 5000);
      
    } catch (error) {
      console.error('Failed to create task:', error);
      
      // Show error message
      setTaskCreationMessage(`Failed to create task: ${error.message || 'Unknown error'}`);
      setTaskCreationSuccess(false);
      
      // Hide after 5 seconds
      setTimeout(() => setTaskCreationSuccess(false), 5000);
    }
  };
  
  // Get status badge color
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Achieved':
        return 'bg-green-500';
      case 'In progress':
        return 'bg-blue-500';
      case 'Not started':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Render metrics chart for a target
  const renderMetricsChart = (metrics) => {
    if (!metrics || !metrics.yearlyProgress || metrics.yearlyProgress.length === 0) {
      return null;
    }
    
    return (
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={metrics.yearlyProgress}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            {metrics.yearlyProgress.some(item => item.isTarget) && (
              <Line 
                type="monotone" 
                dataKey={(data) => data.isTarget ? data.value : null}
                stroke="#ff7300" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };
  
  // Enhanced renderDetailedMetrics with better task display
  const renderDetailedMetrics = (target) => {
    if (!target || !target.detailedMetrics) return null;
    
    const metrics = target.detailedMetrics;
    // Get the tasks for this goal
    const relatedTasks = getTasksForGoal ? getTasksForGoal(target.id) : [];
    
    return (
      <div className="detailed-metrics" style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>{metrics.description}</h3>
        
        {/* Display the goal description if available */}
        {target.description && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Description</h4>
            <p style={{ margin: 0, fontSize: '14px' }}>{target.description}</p>
          </div>
        )}
        
        {/* Metrics Chart */}
        {renderMetricsChart(metrics)}
        
        {/* Metrics Table */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Detailed Metrics</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Metric</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Unit</th>
                {metrics.metrics && metrics.metrics[0]?.values && Object.keys(metrics.metrics[0].values).map(year => (
                  <th key={year} style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>{year}</th>
                ))}
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Target</th>
              </tr>
            </thead>
            <tbody>
              {metrics.metrics?.map((metric, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px' }}>{metric.name}</td>
                  <td style={{ padding: '8px' }}>{metric.unit}</td>
                  {metric.values && Object.entries(metric.values).map(([year, value]) => (
                    <td key={year} style={{ padding: '8px', textAlign: 'right' }}>{value}</td>
                  ))}
                  <td style={{ padding: '8px', textAlign: 'right' }}>{metric.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Related Tasks - Enhanced with better UI */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '16px', margin: 0 }}>Related Tasks</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => handleCreateTaskForGoal(target.id)}
                style={{
                  backgroundColor: 'var(--primary-color, #3498db)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Create Task
              </button>
              {relatedTasks && relatedTasks.length > 0 && (
                <a 
                  href="/task-management"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--primary-color, #3498db)',
                    border: '1px solid var(--primary-color, #3498db)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  View All Tasks
                </a>
              )}
            </div>
          </div>
          
          {relatedTasks && relatedTasks.length > 0 ? (
            <div className="related-tasks-list" style={{ marginTop: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#eee' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Task</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Due Date</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Assignees</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedTasks.map(task => (
                    <tr key={task.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px' }}>{task.title}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: task.status === 'DONE' ? '#4caf50' : 
                                          task.status === 'IN_PROGRESS' ? '#2196f3' : 
                                          task.status === 'IN_REVIEW' ? '#ff9800' : '#9e9e9e',
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          {task.status === 'TODO' ? 'To Do' : 
                          task.status === 'IN_PROGRESS' ? 'In Progress' : 
                          task.status === 'IN_REVIEW' ? 'Review' : 'Done'}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>{formatDate(task.dueDate)}</td>
                      <td style={{ padding: '8px' }}>
                        {task.assignees && task.assignees.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {task.assignees.map((assignee, idx) => (
                              <span key={idx} style={{ 
                                backgroundColor: '#e0e0e0', 
                                padding: '2px 8px', 
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}>
                                {assignee}
                              </span>
                            ))}
                          </div>
                        ) : 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Task-goal integration note */}
              <div style={{ 
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#0d47a1' 
              }}>
                <p style={{ margin: 0 }}>
                  <strong>Note:</strong> Completing a task will automatically update this goal's progress by 10%.
                </p>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary, #666)' }}>No tasks are currently linked to this goal. Create a task to start tracking progress.</p>
          )}
        </div>
      </div>
    );
  };
  
  // Calculate combined loading state
  const isLoading = loading || contextLoading;
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="goals-page">
        <h1 className="page-title">Sustainability Goals</h1>
        <div className="loading-indicator" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px' 
        }}>
          <div className="spinner" style={{
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '50%',
            borderTop: '4px solid #3498db',
            width: '40px',
            height: '40px',
            marginBottom: '20px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading your sustainability goals...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="goals-page">
        <h1 className="page-title">Sustainability Goals</h1>
        <div className="error-message" style={{
          backgroundColor: '#fdeded',
          border: '1px solid #f5c2c7',
          color: '#842029',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p>{error}</p>
          <button 
            onClick={handleRetryLoading}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              marginTop: '16px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="goals-page">
      <h1 className="page-title">Sustainability Goals</h1>
      <p className="page-description">Track and manage your sustainability goals based on your onboarding data</p>
      
      {/* Task Creation Toast */}
      {taskCreationSuccess && taskCreationMessage && (
        <div 
          className="task-creation-message" 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: taskCreationSuccess ? '#4caf50' : '#f44336',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {taskCreationMessage}
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>
        </div>
      )}
      
      {/* Pillar Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div 
          className={`card ${activeTab === 'environment' ? 'active-card' : ''}`} 
          style={{ 
            padding: '20px',
            borderLeft: activeTab === 'environment' ? '4px solid var(--primary-color, #3498db)' : 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onClick={() => setActiveTab('environment')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: activeTab === 'environment' ? 'var(--primary-color, #3498db)' : 'inherit' }}>Environment</div>
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              color: '#4caf50', 
              padding: '4px 8px', 
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {calculatePillarProgress('environment')}%
            </div>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${calculatePillarProgress('environment')}%`, 
                height: '100%', 
                backgroundColor: '#4caf50'
              }}></div>
            </div>
          </div>
          
          <div style={{ fontSize: '14px', color: 'var(--text-secondary, #666)' }}>
            {equinixGoals.environment.reduce((acc, goal) => acc + (Array.isArray(goal.targets) ? goal.targets.length : 0), 0)} targets across {equinixGoals.environment.length} goal areas
          </div>
        </div>
        
        <div 
          className={`card ${activeTab === 'social' ? 'active-card' : ''}`} 
          style={{ 
            padding: '20px',
            borderLeft: activeTab === 'social' ? '4px solid var(--primary-color, #3498db)' : 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onClick={() => setActiveTab('social')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: activeTab === 'social' ? 'var(--primary-color, #3498db)' : 'inherit' }}>Social</div>
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              color: '#2196f3', 
              padding: '4px 8px', 
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {calculatePillarProgress('social')}%
            </div>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${calculatePillarProgress('social')}%`, 
                height: '100%', 
                backgroundColor: '#2196f3'
              }}></div>
            </div>
          </div>
          
          <div style={{ fontSize: '14px', color: 'var(--text-secondary, #666)' }}>
            {equinixGoals.social.reduce((acc, goal) => acc + (Array.isArray(goal.targets) ? goal.targets.length : 0), 0)} targets across {equinixGoals.social.length} goal areas
          </div>
        </div>
        
        <div 
          className={`card ${activeTab === 'governance' ? 'active-card' : ''}`} 
          style={{ 
            padding: '20px',
            borderLeft: activeTab === 'governance' ? '4px solid var(--primary-color, #3498db)' : 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onClick={() => setActiveTab('governance')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: activeTab === 'governance' ? 'var(--primary-color, #3498db)' : 'inherit' }}>Governance</div>
            <div style={{ 
              backgroundColor: '#fff8e1', 
              color: '#ff9800', 
              padding: '4px 8px', 
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {calculatePillarProgress('governance')}%
            </div>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${calculatePillarProgress('governance')}%`, 
                height: '100%', 
                backgroundColor: '#ff9800'
              }}></div>
            </div>
          </div>
          
          <div style={{ fontSize: '14px', color: 'var(--text-secondary, #666)' }}>
            {equinixGoals.governance.reduce((acc, goal) => acc + (Array.isArray(goal.targets) ? goal.targets.length : 0), 0)} targets across {equinixGoals.governance.length} goal areas
          </div>
        </div>
      </div>
      
      {/* Information Card */}
      <div className="info-box" style={{
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        border: '1px solid rgba(33, 150, 243, 0.3)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start'
      }}>
        <div style={{ marginRight: '16px', fontSize: '24px', color: '#2196f3' }}>
          ℹ️
        </div>
        <div>
          <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
            Task Integration
          </p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Goals and tasks are now integrated! When you create a task from a goal, it will appear in the Task Management page. When a linked task is completed, the goal's progress will automatically update.
          </p>
        </div>
      </div>
      
      {/* Add Goal Button */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setIsAddingGoal(!isAddingGoal)}
          style={{
            backgroundColor: isAddingGoal ? '#e0e0e0' : 'var(--primary-color, #3498db)',
            color: isAddingGoal ? '#333' : 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isAddingGoal ? 'Cancel' : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add New Goal
            </>
          )}
        </button>
      </div>
      
      {/* Add Goal Form */}
      {isAddingGoal && (
        <div className="add-goal-form" style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Goal</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Goal Title *</label>
            <input
              type="text"
              value={newGoalData.title}
              onChange={(e) => setNewGoalData({...newGoalData, title: e.target.value})}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #e0e0e0' 
              }}
              placeholder="Enter goal title"
            />
          </div>
      
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
            <textarea
              value={newGoalData.description}
              onChange={(e) => setNewGoalData({...newGoalData, description: e.target.value})}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #e0e0e0',
                minHeight: '80px'
              }}
              placeholder="Enter goal description"
            />
          </div>
      
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Category</label>
              <select
                value={newGoalData.category}
                onChange={(e) => setNewGoalData({...newGoalData, category: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  border: '1px solid #e0e0e0' 
                }}
              >
                <option value="energy">Energy</option>
                <option value="emissions">Emissions</option>
                <option value="waste">Waste & Recycling</option>
                <option value="water">Water</option>
                <option value="biodiversity">Biodiversity</option>
                <option value="social">Social</option>
                <option value="governance">Governance</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Due Date</label>
              <input
                type="date"
                value={newGoalData.due_date}
                onChange={(e) => setNewGoalData({...newGoalData, due_date: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  border: '1px solid #e0e0e0' 
                }}
              />
            </div>
          </div>
      
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Initial Progress (%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={newGoalData.progress}
              onChange={(e) => setNewGoalData({...newGoalData, progress: parseInt(e.target.value)})}
              style={{ width: '100%' }}
            />
            <div style={{ textAlign: 'center' }}>{newGoalData.progress}%</div>
          </div>
      
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontWeight: '500' }}>Targets</label>
              <button
                type="button"
                onClick={addTargetToNewGoal}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--primary-color, #3498db)',
                  border: '1px solid var(--primary-color, #3498db)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Target
              </button>
            </div>
            
            {newGoalData.targets.length === 0 ? (
              <p style={{ color: 'var(--text-secondary, #666)', fontStyle: 'italic' }}>No targets added yet</p>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                {newGoalData.targets.map((target, index) => (
                  <div key={index} style={{ display: 'flex', marginBottom: '8px', gap: '8px' }}>
                    <input
                      type="text"
                      value={target.name}
                      onChange={(e) => updateNewGoalTarget(index, e.target.value)}
                      style={{ 
                        flex: 1,
                        padding: '8px 12px', 
                        borderRadius: '4px', 
                        border: '1px solid #e0e0e0' 
                      }}
                      placeholder="Enter target"
                    />
                    <button
                      type="button"
                      onClick={() => removeTargetFromNewGoal(index)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#f44336',
                        border: '1px solid #f44336',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
      
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsAddingGoal(false)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-secondary, #666)',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddNewGoal}
              disabled={savingGoal || !newGoalData.title}
              style={{
                backgroundColor: 'var(--primary-color, #3498db)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                opacity: savingGoal || !newGoalData.title ? 0.7 : 1
              }}
            >
              {savingGoal ? 'Saving...' : 'Save Goal'}
            </button>
          </div>
        </div>
      )}
      
      {/* Goals by Pillar */}
      <div className="goals-by-pillar">
        {Array.isArray(equinixGoals[activeTab]) && equinixGoals[activeTab].length > 0 ? (
          equinixGoals[activeTab].map(goal => (
            <div key={goal.id} className="goal-category card" style={{ marginBottom: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ 
                padding: '20px', 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>{goal.category}</h2>
                  <p style={{ margin: 0, color: 'var(--text-secondary, #666)' }}>{goal.description}</p>
                </div>
              </div>
              
              <div style={{ padding: '0' }}>
                {goal.targets && goal.targets.map(target => (
                  <div 
                    key={target.id} 
                    className="target-item"
                    style={{
                      padding: '20px',
                      borderBottom: '1px solid #e0e0e0'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: expandedGoalId === target.id ? '16px' : '0'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                          <div 
                            className={`status-badge ${getStatusBadge(target.status)}`}
                            style={{
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              marginRight: '12px'
                            }}
                          >
                            {target.status}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary, #666)' }}>
                            Due: {formatDate(target.dueDate)}
                          </div>
                        </div>
                        
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>{target.name}</h3>
                        
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${target.progress}%`, 
                                  height: '100%', 
                                  backgroundColor: target.status === 'Achieved' ? '#4caf50' : '#2196f3'
                                }}></div>
                              </div>
                            </div>
                            <div style={{ 
                              minWidth: '50px', 
                              textAlign: 'right', 
                              fontWeight: '600', 
                              color: target.status === 'Achieved' ? '#4caf50' : 'inherit'
                            }}>
                              {target.progress}%
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setExpandedGoalId(expandedGoalId === target.id ? null : target.id)}
                          style={{
                            backgroundColor: expandedGoalId === target.id ? 'var(--primary-color, #3498db)' : 'transparent',
                            color: expandedGoalId === target.id ? 'white' : 'var(--primary-color, #3498db)',
                            border: expandedGoalId === target.id ? 'none' : '1px solid var(--primary-color, #3498db)',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          {expandedGoalId === target.id ? 'Hide Details' : 'View Details'}
                        </button>
                        
                        <button
                          onClick={() => handleCreateTaskForGoal(target.id)}
                          style={{
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary, #666)',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          Create Task
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded View with Detailed Metrics */}
                    {expandedGoalId === target.id && renderDetailedMetrics(target)}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary, #666)', margin: '0 0 20px 0' }}>
              No {activeTab} goals found. Complete the onboarding process to set up your sustainability goals.
            </p>
            <button
              onClick={() => window.location.href = '/onboarding'}
              style={{
                backgroundColor: 'var(--primary-color, #3498db)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Start Onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Goals;