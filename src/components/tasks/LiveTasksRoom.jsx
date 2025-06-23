// src/components/tasks/LiveTasksRoom.jsx
import React from 'react';
import { EnhancedRoomProvider } from '../../liveblocks';
import TaskManagement from '../../pages/TaskManagement';
import { useAuth0 } from '@auth0/auth0-react';

// Simplified component - just provides the room context
const LiveTasksRoom = () => {
  const { user } = useAuth0();
  const ROOM_ID = "tasks-board-fixed";
  
  return (
    <EnhancedRoomProvider 
      id={ROOM_ID}
      initialPresence={{
        viewingTaskId: null,
        user: user ? {
          id: user.sub || "anonymous-" + Date.now(),
          name: user.name || user.email?.split('@')[0] || 'Anonymous',
          email: user.email || 'anonymous@example.com',
          picture: user.picture || ''
        } : { 
          id: "anonymous-" + Date.now(),
          name: "Anonymous", 
          email: "anonymous@example.com",
          picture: ""
        }
      }}>
      {/* Direct render - no intermediate component */}
      <TaskManagement />
    </EnhancedRoomProvider>
  );
};

export default LiveTasksRoom;