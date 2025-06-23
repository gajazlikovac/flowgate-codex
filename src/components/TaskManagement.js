// src/pages/TaskManagement.js
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTaskGoalIntegration } from '../context/TaskGoalContext';
// Add Liveblocks imports directly
import { useOthers, useMyPresence } from '../liveblocks';

// Keep your existing column definitions, ComplianceCategory, PriorityLevels, etc.
const columns = [
  { id: 'todo', name: 'To Do', status: 'TODO' },
  { id: 'progress', name: 'In Progress', status: 'IN_PROGRESS' },
  { id: 'review', name: 'In Review', status: 'IN_REVIEW' },
  { id: 'done', name: 'Done', status: 'DONE' }
];

const ComplianceCategory = {
  ENERGY_EFFICIENCY: "Energy Efficiency",
  RENEWABLE_ENERGY: "Renewable Energy",
  WATER_CONSERVATION: "Water Conservation",
  WASTE_MANAGEMENT: "Waste Management",
  ISO_STANDARDS: "ISO Standards",
  EU_TAXONOMY: "EU Taxonomy",
  EED: "Energy Efficiency Directive"
};

// Priority levels with colors
const PriorityLevels = {
  LOW: { label: "Low", color: "#4caf50" },
  MEDIUM: { label: "Medium", color: "#2196f3" },
  HIGH: { label: "High", color: "#ff9800" },
  CRITICAL: { label: "Critical", color: "#f44336" }
};

// Helper for date formatting
const formatDate = (date) => {
  if (!date) return 'No due date';
  
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
};

// Real invite API
const INVITE_API = {
  endpoint: "https://invite-api-866853235757.europe-west3.run.app/invite"
};

// Available team members for assignment - keep this as is for now
const teamMembers = [
  { id: 1, name: "John Smith", avatar: "/api/placeholder/32/32", role: "Energy Manager" },
  { id: 2, name: "Sarah Johnson", avatar: "/api/placeholder/32/32", role: "Compliance Officer" },
  { id: 3, name: "Mike Davis", avatar: "/api/placeholder/32/32", role: "Sustainability Director" },
  { id: 4, name: "Emma Wilson", avatar: "/api/placeholder/32/32", role: "Data Center Manager" },
  { id: 5, name: "Alex Thompson", avatar: "/api/placeholder/32/32", role: "Operations Lead" }
];

// Remove the props entirely and connect directly to Liveblocks
const TaskManagement = () => {
  // DIRECT CONNECTION TO LIVEBLOCKS - No more props needed
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const { user } = useAuth0();
  
  // Extract online users directly from Liveblocks
  const onlineUsers = others
    .filter(other => other.presence?.user)
    .map(other => other.presence.user);
  
  // Map of tasks being viewed by other users - direct access
  const tasksBeingViewed = others.reduce((acc, other) => {
    if (other.presence?.viewingTaskId) {
      if (!acc[other.presence.viewingTaskId]) {
        acc[other.presence.viewingTaskId] = [];
      }
      if (other.presence.user) {
        acc[other.presence.viewingTaskId].push(other.presence.user);
      }
    }
    return acc;
  }, {});
  
  // Function to handle task viewing
  const handleTaskView = (taskId) => {
    updateMyPresence({ viewingTaskId: taskId });
  };

  console.log("DIRECT ACCESS - Online users:", onlineUsers);
  console.log("DIRECT ACCESS - Current user:", user);
  
  const { isAuthenticated } = useAuth0();
  const { 
    tasks, 
    goals,
    loading: contextLoading, 
    error: contextError,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    addTaskAssignee,
    removeTaskAssignee,
    refreshData
  } = useTaskGoalIntegration();
  
  // State management
  const [tasksByColumn, setTasksByColumn] = useState({});
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showTaskDetailsDialog, setShowTaskDetailsDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editedTask, setEditedTask] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetColumn, setDropTargetColumn] = useState(null);
  const [showInviteUI, setShowInviteUI] = useState(false);
  const [customInviteEmail, setCustomInviteEmail] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // New task form data
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "",
    assignees: [],
    dueDate: null,
    priority: "MEDIUM",
    linkedGoalId: null
  });

  // Group tasks by column
  useEffect(() => {
    const filteredTasks = tasks.filter(task => 
      (filterCategory === "All" || task.category === filterCategory) &&
      (filterPriority === "All" || task.priority === filterPriority)
    );
    
    const grouped = {};
    
    // Initialize empty arrays for each column
    columns.forEach(column => {
      grouped[column.id] = [];
    });
    
    // Group tasks by column
    filteredTasks.forEach(task => {
      // Find which column this task belongs to
      const column = columns.find(c => c.status === task.status);
      if (column) {
        grouped[column.id].push(task);
      }
    });
    
    setTasksByColumn(grouped);
  }, [tasks, filterCategory, filterPriority]);

  // Helper function to show toast messages
  const showToast = (message) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  // Function to handle task status changes
  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      setIsLoading(true);
      
      // Use the context function to update status
      const result = await updateTaskStatus(taskId, newStatus);
      
      // Find the task for notification
      const updatedTask = tasks.find(t => t.id === taskId);
      const columnName = columns.find(col => col.status === newStatus)?.name;
      
      if (updatedTask && columnName) {
        showToast(`Task "${updatedTask.title}" moved to ${columnName}`);
      }
      
      // If goal was updated, show additional message
      if (result.goalUpdated) {
        const goalName = goals[result.linkedGoalId]?.title || 'Linked goal';
        showToast(`Goal "${goalName}" progress updated`);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(task);
    
    // Set the dragged task ID as data
    e.dataTransfer.setData('text/plain', task.id);
    
    // Make drag image semi-transparent
    if (e.target.classList) {
      setTimeout(() => {
        e.target.classList.add('dragging');
      }, 0);
    }
  };

  const handleDragEnd = (e) => {
    if (e.target.classList) {
      e.target.classList.remove('dragging');
    }
    
    setDraggedItem(null);
    setDropTargetColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetColumn(columnId);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId) {
      console.error('No task ID in data transfer');
      return;
    }
    
    const destinationColumn = columns.find(col => col.id === columnId);
    
    if (!destinationColumn) {
      console.error('No destination column found');
      return;
    }
    
    // Use the handleTaskStatusChange which now uses the API
    await handleTaskStatusChange(taskId, destinationColumn.status);
    
    setDropTargetColumn(null);
  };

  // Handle creating a new task - FIXED VERSION
  const handleCreateTask = async () => {
    // Validate required fields
    if (!newTask.title) {
      alert('Please enter a task title');
      return;
    }
    
    if (!newTask.category) {
      alert('Please select a category');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Format dates properly and ensure required fields
      const formattedTask = {
        ...newTask,
        // Required fields - must be included
        title: newTask.title,
        status: 'TODO', // Required field that was missing
        category: newTask.category || 'ENERGY_EFFICIENCY', // Required field with fallback
        // Format date if it exists
        dueDate: newTask.dueDate ? 
                 (typeof newTask.dueDate === 'string' ? 
                  newTask.dueDate : 
                  newTask.dueDate.toISOString().split('T')[0]) : 
                 null
      };
      
      console.log('Creating task with data:', formattedTask);
      
      // Create the task using the API
      await createTask(formattedTask);
      
      setShowNewTaskDialog(false);
      resetNewTaskForm();
      showToast('New task created successfully');
      
    } catch (error) {
      console.error('Error creating task:', error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset new task form
  const resetNewTaskForm = () => {
    setNewTask({
      title: "",
      description: "",
      category: "",
      assignees: [],
      dueDate: null,
      priority: "MEDIUM",
      linkedGoalId: null
    });
  };

  // Open task details
  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task);
    setShowTaskDetailsDialog(true);
    setShowInviteUI(false);
    
    // Update presence using Liveblocks directly
    console.log("[TaskManagement] Viewing task:", task.id);
    handleTaskView(task.id);
  };

  // Close task details
  const handleCloseTaskDetails = () => {
    setShowTaskDetailsDialog(false);
    
    // Update presence using Liveblocks directly
    console.log("[TaskManagement] Stopped viewing task");
    handleTaskView(null);
  };

  // Open task edit dialog
  const handleOpenEditTask = () => {
    if (!selectedTask) return;
    
    setEditedTask({...selectedTask});
    setShowTaskDetailsDialog(false);
    setShowEditTaskDialog(true);
    
    // Maintain presence while switching to edit mode
    // No need to change task view here since we're still viewing the same task
  };

  // Save edited task
  const handleSaveEditedTask = async () => {
    if (!editedTask) return;
    
    // Validation
    if (!editedTask.title) {
      alert('Please enter a task title');
      return;
    }
    
    if (!editedTask.category) {
      alert('Please select a category');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Format dates properly
      const formattedTask = {
        ...editedTask,
        dueDate: editedTask.dueDate ? 
                 (typeof editedTask.dueDate === 'string' ? 
                  editedTask.dueDate : 
                  editedTask.dueDate.toISOString().split('T')[0]) : 
                 null
      };
      
      // Check if status is changing
      const originalTask = tasks.find(task => task.id === editedTask.id);
      const statusChanged = originalTask?.status !== editedTask.status;
      
      let result;
      
      // If status is changing, use updateTaskStatus to properly handle goal updates
      if (statusChanged) {
        result = await updateTaskStatus(editedTask.id, editedTask.status);
        
        // Then update other fields
        const taskWithoutStatus = {...formattedTask};
        delete taskWithoutStatus.status;
        
        await updateTask(editedTask.id, taskWithoutStatus);
      } else {
        // Otherwise just update all fields
        result = await updateTask(editedTask.id, formattedTask);
      }
      
      setShowEditTaskDialog(false);
      
      // Clear viewing state when closing dialog using Liveblocks
      handleTaskView(null);
      
      // Determine toast message
      const wasCompleted = originalTask?.status === 'DONE';
      const isNowCompleted = editedTask.status === 'DONE';
      const completionStatusChanged = wasCompleted !== isNowCompleted;
      
      if (completionStatusChanged && isNowCompleted) {
        showToast('Task marked as complete!');
      } else if (completionStatusChanged && !isNowCompleted) {
        showToast('Task marked as incomplete');
      } else {
        showToast('Task updated successfully');
      }
      
      // If goal was updated, show additional message
      if (result.goalUpdated) {
        const goalName = goals[result.linkedGoalId]?.title || 'Linked goal';
        showToast(`Goal "${goalName}" progress updated`);
      }
      
    } catch (error) {
      console.error('Error updating task:', error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get task info before deletion for better messages
      const taskToDelete = tasks.find(t => t.id === taskId);
      
      // Delete using API
      const result = await deleteTask(taskId);
      
      // Close dialogs if the deleted task was selected
      if (selectedTask && selectedTask.id === taskId) {
        setShowTaskDetailsDialog(false);
        setShowEditTaskDialog(false);
        // Clear viewing presence using Liveblocks
        handleTaskView(null);
      }
      
      showToast(`Task "${taskToDelete?.title || 'Unknown'}" deleted`);
      
      // If goal was updated, show additional message
      if (result.goalUpdated) {
        const goalName = goals[result.linkedGoalId]?.title || 'Linked goal';
        showToast(`Goal "${goalName}" progress updated`);
      }
      
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle invite UI visibility
  const toggleInviteUI = () => {
    setShowInviteUI(!showInviteUI);
  };

  // Invite colleague to task
  const handleInviteColleague = async (taskId, colleague) => {
    try {
      setIsLoading(true);
      
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }
      
      // Check if colleague is already assigned
      if (taskToUpdate.assignees && taskToUpdate.assignees.includes(colleague.name)) {
        showToast(`${colleague.name} is already assigned to this task`);
        return;
      }
      
      // Use the API to add assignee
      await addTaskAssignee(taskId, colleague.name, null);
      
      // If we have a selected task, update it as well
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask, 
          assignees: [...(selectedTask.assignees || []), colleague.name]
        });
      }
      
      showToast(`${colleague.name} added to task`);
      
    } catch (error) {
      console.error('Error adding assignee:', error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle custom invites via email with real invite API
  const handleCustomInvite = async (taskId) => {
    if (!customInviteEmail || !customInviteEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    // Extract name from email (before @)
    const name = customInviteEmail.split('@')[0].split('.').map(
      part => part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
    
    // Create a new colleague object
    const newColleague = {
      id: Date.now(),
      name: name,
      role: "Invited Colleague",
      avatar: "/api/placeholder/32/32"
    };
    
    setIsLoading(true);
    
    try {
      // Make the API call to the real invite API
      const response = await fetch(INVITE_API.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customInviteEmail })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Invitation sent successfully:", data);
      
      // Add the colleague to the task via API
      await addTaskAssignee(taskId, newColleague.name, customInviteEmail);
      
      setCustomInviteEmail('');
      showToast(`Invitation sent to ${customInviteEmail}`);
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      showToast(`Failed to send invitation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email invite for new task creation
  const handleNewTaskInvite = async () => {
    if (!customInviteEmail || !customInviteEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    // Extract name from email
    const name = customInviteEmail.split('@')[0].split('.').map(
      part => part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
    
    setIsLoading(true);
    
    try {
      // Call the real invite API
      const response = await fetch(INVITE_API.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customInviteEmail })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Invitation sent successfully:", data);
      
      // Add to new task assignees
      if (!newTask.assignees.includes(name)) {
        setNewTask({
          ...newTask,
          assignees: [...newTask.assignees, name]
        });
      }
      
      setCustomInviteEmail('');
      showToast(`Invitation sent to ${customInviteEmail}`);
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      showToast(`Failed to send invitation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove colleague from task
  const handleRemoveColleague = async (taskId, colleagueName) => {
    try {
      setIsLoading(true);
      
      // Use API to remove assignee
      await removeTaskAssignee(taskId, colleagueName);
      
      // If we have a selected task, update it as well
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask, 
          assignees: selectedTask.assignees.filter(name => name !== colleagueName)
        });
      }
      
      showToast(`${colleagueName} removed from task`);
      
    } catch (error) {
      console.error('Error removing assignee:', error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Goal selection component for the task form
  const renderGoalSelection = () => {
    if (!goals || Object.keys(goals).length === 0) return null;
    
    return (
      <div className="form-group" style={{ marginBottom: "16px" }}>
        <label htmlFor="task-linked-goal">Link to Sustainability Goal (Optional)</label>
        <select
          id="task-linked-goal"
          value={newTask.linkedGoalId || ""}
          onChange={e => setNewTask({...newTask, linkedGoalId: e.target.value || null})}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid #e0e0e0"
          }}
        >
          <option value="">None - Not linked to any goal</option>
          {Object.values(goals).map(goal => (
            <option key={goal.id} value={goal.id}>
              {goal.title} ({goal.progress}% complete)
            </option>
          ))}
        </select>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          Linking a task to a goal will update the goal's progress when this task is completed.
        </p>
      </div>
    );
  };

  // Keep your existing UI rendering with these additions
  return (
    <div className="task-management">
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h1 className="page-title">Task Management</h1>
        <p className="page-description">Track and manage compliance and sustainability tasks</p>
      </div>

      {/* Show loading indicator */}
      {(contextLoading || isLoading) && (
        <div style={{ 
          position: "fixed", 
          top: "20px", 
          right: "20px",
          backgroundColor: "#2196f3",
          color: "white",
          padding: "12px 20px", 
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 1000
        }}>
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      )}
      
      {/* Show error message */}
      {contextError && (
        <div style={{ 
          backgroundColor: "#fdeded",
          border: "1px solid #f5c2c7",
          color: "#842029",
          padding: "12px 16px",
          borderRadius: "4px",
          margin: "0 0 16px 0"
        }}>
          Error: {contextError}
          <button 
            onClick={refreshData} 
            style={{ marginLeft: "16px", border: "none", background: "none", color: "#0d6efd", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Online Users Avatar Stack - UPDATED for Direct Liveblocks */}
      <div className="online-users-container" style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <span style={{ marginRight: "10px", fontSize: "14px", color: "#666" }}>
          Online now:
        </span>
        <div className="avatar-stack" style={{ display: "flex" }}>
          {/* Current user avatar from Auth0 */}
          {user && (
            <div 
              className="user-avatar current-user"
              title={`${user.name || user.email} (you)`}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#2196f3",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "-8px",
                border: "2px solid white",
                zIndex: "2",
                position: "relative"
              }}
            >
              {(user.name || user.email || "You").charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Other users' avatars - Direct from Liveblocks */}
          {Array.isArray(onlineUsers) && onlineUsers.length > 0 ? (
            onlineUsers.map((otherUser, index) => (
              <div 
                key={otherUser.id || index}
                className="user-avatar"
                title={otherUser.name || otherUser.email || "Anonymous"}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#4caf50",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "-8px",
                  border: "2px solid white",
                  zIndex: 1,
                  position: "relative"
                }}
              >
                {(otherUser.name || otherUser.email || "?").charAt(0).toUpperCase()}
              </div>
            ))
          ) : (
            <span style={{ fontSize: "14px", color: "#999" }}>No one else is online</span>
          )}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="filters-container" style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "20px"
      }}>
        <div className="filters" style={{ display: "flex", gap: "16px" }}>
          <div className="filter">
            <label htmlFor="category-filter">Category</label>
            <select 
              id="category-filter"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #e0e0e0"
              }}
            >
              <option value="All">All Categories</option>
              {Object.values(ComplianceCategory).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="filter">
            <label htmlFor="priority-filter">Priority</label>
            <select 
              id="priority-filter"
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #e0e0e0"
              }}
            >
              <option value="All">All Priorities</option>
              {Object.keys(PriorityLevels).map(priority => (
                <option key={priority} value={priority}>{PriorityLevels[priority].label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={() => setShowNewTaskDialog(true)}
          style={{
            backgroundColor: "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px"
          }}
        >
          New Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginTop: "20px"
      }}>
        {/* Keep existing kanban columns, but update to use the drag and drop handlers */}
        {columns.map(column => (
          <div 
            key={column.id} 
            className={`kanban-column ${dropTargetColumn === column.id ? 'column-drop-target' : ''}`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            style={{
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              minHeight: "500px"
            }}
          >
            <h2 className="column-title" style={{ 
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span>{column.name}</span>
              <span className="task-count" style={{
                backgroundColor: "#2196f3",
                color: "white",
                borderRadius: "20px",
                padding: "2px 8px",
                fontSize: "12px"
              }}>
                {tasksByColumn[column.id]?.length || 0}
              </span>
            </h2>
            
            <div 
              className="task-list"
              style={{ minHeight: "400px" }}
            >
              {tasksByColumn[column.id]?.map((task) => (
                <div
                  key={task.id}
                  className="task-card"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleOpenTaskDetails(task)}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "12px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    borderLeft: `4px solid ${PriorityLevels[task.priority]?.color || "#2196f3"}`,
                    cursor: "grab",
                    position: "relative" // Add this for positioning the viewing indicator
                  }}
                >
                  {/* Add viewing indicators */}
                  {tasksBeingViewed[task.id] && tasksBeingViewed[task.id].length > 0 && (
                    <div className="viewing-indicator" style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex"
                    }}>
                      {tasksBeingViewed[task.id].map((viewingUser, idx) => (
                        <div
                          key={idx}
                          title={`${viewingUser.name || viewingUser.email} is viewing this task`}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#ff9800",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            marginRight: "-8px",
                            border: "2px solid white",
                            zIndex: idx + 1,
                            position: "relative"
                          }}
                        >
                          {(viewingUser.name || viewingUser.email || "?").charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}

                  <h3 style={{ marginBottom: "8px", fontSize: "16px" }}>{task.title}</h3>
                  <div className="task-meta" style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>
                    <span className="category" style={{
                      display: "inline-block",
                      backgroundColor: "#f0f0f0",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      marginRight: "8px"
                    }}>
                      {task.category}
                    </span>
                    <span className="due-date">
                      {task.dueDate ? `Due: ${formatDate(task.dueDate)}` : 'No due date'}
                    </span>
                  </div>
                  {task.linkedGoalId && (
                    <div style={{ 
                      fontSize: "11px", 
                      backgroundColor: "#e3f2fd", 
                      color: "#2196f3",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      display: "inline-block",
                      marginBottom: "8px"
                    }}>
                      ✓ Goal-linked Task
                    </div>
                  )}
                  <div className="task-assignees" style={{ display: "flex", marginTop: "8px" }}>
                    {task.assignees && task.assignees.length > 0 ? (
                      task.assignees.map((assignee, idx) => (
                        <div 
                          key={idx} 
                          className="assignee-avatar"
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#2196f3",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            marginRight: "4px"
                          }}
                          title={assignee}
                        >
                          {assignee.charAt(0)}
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: "12px", color: "#999" }}>Unassigned</span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Empty state for columns */}
              {(!tasksByColumn[column.id] || tasksByColumn[column.id].length === 0) && (
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center",
                  height: "200px",
                  color: "#999",
                  textAlign: "center",
                  padding: "0 20px"
                }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>📋</div>
                  <p>Drop tasks here or add a new task</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task Dialogs */}
      {/* New Task Dialog */}
      {showNewTaskDialog && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            width: "600px",
            maxWidth: "90%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h2 style={{ marginBottom: "20px" }}>Create New Task</h2>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="task-title">Title</label>
              <input
                id="task-title"
                type="text"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                placeholder="Task title"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0"
                }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                value={newTask.description}
                onChange={e => setNewTask({...newTask, description: e.target.value})}
                placeholder="Task description"
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0",
                  resize: "vertical"
                }}
              />
            </div>
            
            <div className="form-row" style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="task-category">Category</label>
                <select
                  id="task-category"
                  value={newTask.category}
                  onChange={e => setNewTask({...newTask, category: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #e0e0e0"
                  }}
                >
                  <option value="">Select Category</option>
                  {Object.values(ComplianceCategory).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="task-priority">Priority</label>
                <select
                  id="task-priority"
                  value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #e0e0e0"
                  }}
                >
                  {Object.keys(PriorityLevels).map(priority => (
                    <option key={priority} value={priority}>{PriorityLevels[priority].label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="task-due-date">Due Date</label>
              <input
                id="task-due-date"
                type="date"
                onChange={e => setNewTask({...newTask, dueDate: new Date(e.target.value)})}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0"
                }}
              />
            </div>
            
            {/* Add Goal Selection */}
            {renderGoalSelection()}
            
            {/* Team Members Selection */}
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label>Assignees</label>
              <div className="assignee-selector" style={{ marginTop: "8px" }}>
                {teamMembers.map(member => (
                  <div 
                    key={member.id}
                    className="team-member-option"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px",
                      marginBottom: "4px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      backgroundColor: newTask.assignees.includes(member.name) 
                        ? "#f0f0f0" 
                        : "transparent"
                    }}
                    onClick={() => {
                      if (newTask.assignees.includes(member.name)) {
                        setNewTask({
                          ...newTask, 
                          assignees: newTask.assignees.filter(name => name !== member.name)
                        });
                      } else {
                        setNewTask({
                          ...newTask,
                          assignees: [...newTask.assignees, member.name]
                        });
                      }
                    }}
                  >
                    <div 
                      className="member-avatar"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "#2196f3",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "12px"
                      }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div className="member-info">
                      <div style={{ fontWeight: "500" }}>{member.name}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {member.role}
                      </div>
                    </div>
                    {newTask.assignees.includes(member.name) && (
                      <div 
                        style={{ 
                          marginLeft: "auto",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "#2196f3",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                ))}

                {/* Custom invite section */}
                <div className="invite-section" style={{
                  marginTop: "12px",
                  padding: "10px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "8px"
                }}>
                  <h4 style={{ marginBottom: "10px", fontSize: "14px" }}>Invite by Email</h4>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="email"
                      placeholder="colleague@example.com"
                      value={customInviteEmail}
                      onChange={e => setCustomInviteEmail(e.target.value)}
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: "1px solid #e0e0e0"
                      }}
                    />
                    <button
                      onClick={handleNewTaskInvite}
                      disabled={isLoading}
                      style={{
                        backgroundColor: "#2196f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        opacity: isLoading ? "0.7" : "1"
                      }}
                    >
                      {isLoading && <div className="spinner"></div>}
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button 
                onClick={() => {
                  setShowNewTaskDialog(false);
                  resetNewTaskForm();
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f0f0f0",
                  border: "none",
                  borderRadius: "4px"
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateTask}
                style={{
                  backgroundColor: "#2196f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 16px"
                }}
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Dialog */}
      {showTaskDetailsDialog && selectedTask && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            width: "700px",
            maxWidth: "90%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <div className="task-header" style={{ 
              borderBottom: "1px solid #e0e0e0",
              paddingBottom: "16px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between"
            }}>
              <h2>{selectedTask.title}</h2>
              <button 
                onClick={handleCloseTaskDetails}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            </div>
            
            <div className="task-info-grid" style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "20px",
              marginBottom: "24px"
            }}>
              <div className="info-group">
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>Status</h3>
                <p style={{ fontWeight: "500" }}>
                  {columns.find(col => col.status === selectedTask.status)?.name || selectedTask.status}
                </p>
              </div>
              
              <div className="info-group">
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>Category</h3>
                <p style={{ fontWeight: "500" }}>{selectedTask.category}</p>
              </div>
              
              <div className="info-group">
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>Priority</h3>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span 
                    style={{ 
                      width: "12px", 
                      height: "12px", 
                      borderRadius: "50%", 
                      backgroundColor: PriorityLevels[selectedTask.priority]?.color || "#2196f3",
                      marginRight: "8px"
                    }}
                  ></span>
                  <p style={{ fontWeight: "500" }}>{PriorityLevels[selectedTask.priority]?.label || "Medium"}</p>
                </div>
              </div>
              
              <div className="info-group">
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>Due Date</h3>
                <p style={{ fontWeight: "500" }}>
                  {selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'No due date'}
                </p>
              </div>
              
              {/* Enhanced Linked Goal Information */}
              {selectedTask.linkedGoalId && (
                <div className="info-group" style={{ 
                  gridColumn: "1 / -1", 
                  backgroundColor: "#e3f2fd", 
                  padding: "12px", 
                  borderRadius: "8px" 
                }}>
                  <h3 style={{ fontSize: "14px", color: "#0d47a1", marginBottom: "8px" }}>Linked Goal</h3>
                  {goals[selectedTask.linkedGoalId] ? (
                    <div>
                      <p style={{ fontWeight: "500", color: "#0d47a1", margin: "0 0 4px 0" }}>
                        This task is linked to: <strong>{goals[selectedTask.linkedGoalId].title}</strong>
                      </p>
                      <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#1565c0" }}>
                        Current progress: <strong>{goals[selectedTask.linkedGoalId].progress}%</strong>
                      </p>
                      <p style={{ margin: "0", fontSize: "13px", color: "#1565c0" }}>
                        Completing this task will increase the goal's progress by 10%.
                      </p>
                      <a 
                        href="/goals" 
                        style={{ 
                          display: "inline-block", 
                          marginTop: "8px", 
                          color: "#1976d2", 
                          fontSize: "13px", 
                          textDecoration: "none" 
                        }}
                      >
                        View goal details →
                      </a>
                    </div>
                  ) : (
                    <p style={{ fontWeight: "500", color: "#0d47a1" }}>
                      This task is linked to a sustainability goal. Completing this task will update the goal's progress.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="task-description" style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Description</h3>
              <p style={{ lineHeight: "1.5" }}>{selectedTask.description || "No description provided."}</p>
            </div>
            
            <div className="task-assignees" style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                <span>Assignees</span>
                <button 
                  style={{
                    fontSize: "14px",
                    color: "#2196f3",
                    background: "none",
                    border: "none",
                    padding: "0",
                    cursor: "pointer"
                  }}
                  onClick={toggleInviteUI}
                >
                  {showInviteUI ? "Hide Invite" : "+ Invite"}
                </button>
              </h3>
              
              <div className="assignees-list">
                {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                  selectedTask.assignees.map((assignee, idx) => {
                    const member = teamMembers.find(m => m.name === assignee) || { role: "Team Member" };
                    return (
                      <div 
                        key={idx}
                        className="assignee-item"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px",
                          marginBottom: "8px",
                          backgroundColor: "#f0f0f0",
                          borderRadius: "4px",
                          justifyContent: "space-between"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div 
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: "#2196f3",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "12px",
                              fontSize: "18px"
                            }}
                          >
                            {assignee.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: "500" }}>{assignee}</div>
                            <div style={{ fontSize: "12px", color: "#666" }}>
                              {member.role}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveColleague(selectedTask.id, assignee)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#999",
                            cursor: "pointer"
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p>No assignees yet. Click "Invite" to add team members.</p>
                )}
              </div>
              
              {/* Invite UI */}
              {showInviteUI && (
                <div className="invite-ui" style={{ 
                  marginTop: "16px", 
                  backgroundColor: "#f5f5f5", 
                  padding: "16px", 
                  borderRadius: "8px" 
                }}>
                  <h4 style={{ fontSize: "14px", marginBottom: "12px" }}>Add Team Members</h4>
                  
                  {/* Custom invite by email section */}
                  <div style={{ marginBottom: "16px" }}>
                    <h5 style={{ fontSize: "13px", marginBottom: "8px" }}>Invite by Email</h5>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="email"
                        placeholder="colleague@example.com"
                        value={customInviteEmail}
                        onChange={e => setCustomInviteEmail(e.target.value)}
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "4px",
                          border: "1px solid #e0e0e0"
                        }}
                      />
                      <button
                        onClick={() => handleCustomInvite(selectedTask.id)}
                        disabled={isLoading}
                        style={{
                          backgroundColor: "#2196f3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          opacity: isLoading ? "0.7" : "1"
                        }}
                      >
                        {isLoading && <div className="spinner"></div>}
                        Invite
                      </button>
                    </div>
                    <p style={{ 
                      fontSize: "12px", 
                      color: "#666", 
                      marginTop: "8px" 
                    }}>
                      This will send an invitation email via the invite API
                    </p>
                  </div>
                  
                  <h5 style={{ fontSize: "13px", marginBottom: "8px" }}>Select Team Members</h5>
                  {teamMembers
                    .filter(member => !selectedTask.assignees?.includes(member.name))
                    .map(member => (
                      <div 
                        key={member.id}
                        className="team-member-option"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px",
                          marginBottom: "4px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          transition: "background-color 0.2s"
                        }}
                        onClick={() => handleInviteColleague(selectedTask.id, member)}
                      >
                        <div 
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#2196f3",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: "12px"
                          }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <div className="member-info">
                          <div style={{ fontWeight: "500" }}>{member.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {member.role}
                          </div>
                        </div>
                        <button
                          style={{
                            marginLeft: "auto",
                            backgroundColor: "#2196f3",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "12px"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInviteColleague(selectedTask.id, member);
                          }}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
            
            <div className="task-actions" style={{ 
              borderTop: "1px solid #e0e0e0",
              paddingTop: "16px",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px"
            }}>
              <button 
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }}
                onClick={() => handleDeleteTask(selectedTask.id)}
              >
                Delete
              </button>
              
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f0f0f0",
                    border: "none",
                    borderRadius: "4px"
                  }}
                  onClick={handleCloseTaskDetails}
                >
                  Close
                </button>
                
                <button 
                  style={{
                    backgroundColor: "#2196f3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 16px"
                  }}
                  onClick={handleOpenEditTask}
                >
                  Edit Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Task Dialog */}
      {showEditTaskDialog && editedTask && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            width: "600px",
            maxWidth: "90%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h2 style={{ marginBottom: "20px" }}>Edit Task</h2>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="edit-task-title">Title</label>
              <input
                id="edit-task-title"
                type="text"
                value={editedTask.title}
                onChange={e => setEditedTask({...editedTask, title: e.target.value})}
                placeholder="Task title"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0"
                }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="edit-task-description">Description</label>
              <textarea
                id="edit-task-description"
                value={editedTask.description}
                onChange={e => setEditedTask({...editedTask, description: e.target.value})}
                placeholder="Task description"
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0",
                  resize: "vertical"
                }}
              />
            </div>
            
            <div className="form-row" style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="edit-task-category">Category</label>
                <select
                  id="edit-task-category"
                  value={editedTask.category}
                  onChange={e => setEditedTask({...editedTask, category: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #e0e0e0"
                  }}
                >
                  <option value="">Select Category</option>
                  {Object.values(ComplianceCategory).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="edit-task-priority">Priority</label>
                <select
                  id="edit-task-priority"
                  value={editedTask.priority}
                  onChange={e => setEditedTask({...editedTask, priority: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #e0e0e0"
                  }}
                >
                  {Object.keys(PriorityLevels).map(priority => (
                    <option key={priority} value={priority}>{PriorityLevels[priority].label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="edit-task-due-date">Due Date</label>
              <input
                id="edit-task-due-date"
                type="date"
                defaultValue={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                onChange={e => setEditedTask({...editedTask, dueDate: new Date(e.target.value)})}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0"
                }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="edit-task-status">Status</label>
              <select
                id="edit-task-status"
                value={editedTask.status}
                onChange={e => setEditedTask({...editedTask, status: e.target.value})}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0"
                }}
              >
                {columns.map(column => (
                  <option key={column.id} value={column.status}>{column.name}</option>
                ))}
              </select>
            </div>
            
            {/* Show goal information but don't allow changing it */}
            {editedTask.linkedGoalId && (
              <div style={{ 
                backgroundColor: "#e3f2fd", 
                padding: "12px", 
                borderRadius: "8px", 
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{ color: "#0d47a1", fontSize: "20px" }}>ℹ️</div>
                <div>
                  <p style={{ margin: 0, color: "#0d47a1", fontWeight: "500" }}>Goal-linked Task</p>
                  <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#1565c0" }}>
                    This task is linked to a sustainability goal. Setting this task to "Done" will update the goal's progress.
                  </p>
                </div>
              </div>
            )}
            
            <div className="form-actions" style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "24px" }}>
              <button 
                onClick={() => handleDeleteTask(editedTask.id)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }}
              >
                Delete Task
              </button>
              
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  onClick={() => {
                    setShowEditTaskDialog(false);
                    // Clear the viewingTaskId when closing edit dialog using Liveblocks
                    handleTaskView(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f0f0f0",
                    border: "none",
                    borderRadius: "4px"
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEditedTask}
                  style={{
                    backgroundColor: "#2196f3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 16px"
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="toast-container" style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#4caf50",
          color: "white",
          padding: "12px 20px",
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          zIndex: 1001
        }}>
          {toastMessage}
        </div>
      )}
      
      {/* Task Movement Toast Notification */}
      {draggedItem && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#333",
          color: "white",
          padding: "10px 20px",
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          zIndex: 1001
        }}>
          Moving task: {draggedItem.title}
          {dropTargetColumn && ` → ${columns.find(col => col.id === dropTargetColumn)?.name}`}
        </div>
      )}
      
      {/* Loading Indicator */}
      {isLoading && !showSuccessToast && !draggedItem && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: "#2196f3",
          color: "white",
          padding: "12px 20px",
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <div className="spinner" style={{
            border: "3px solid rgba(255,255,255,0.2)",
            borderRadius: "50%",
            borderTop: "3px solid white",
            width: "16px",
            height: "16px",
            animation: "spin 1s linear infinite"
          }}></div>
          Processing...
        </div>
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .task-card.dragging {
            opacity: 0.5;
            transform: rotate(3deg);
          }
          
          .column-drop-target {
            background-color: rgba(200, 230, 255, 0.4);
            border: 2px dashed #2196f3;
            transition: all 0.2s ease;
          }
        `}
      </style>
    </div>
  );
};

export default TaskManagement;