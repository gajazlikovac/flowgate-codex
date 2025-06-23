import React from 'react';
import { EnhancedRoomProvider } from '../../liveblocks';
import Workflows from '../Workflows';  // Import from components directory, not from a workflows subdirectory
import { useAuth0 } from '@auth0/auth0-react';

// Simplified component - just provides the room context
const LiveWorkflowsRoom = () => {
  const { user } = useAuth0();
  const ROOM_ID = "workflows-board";
  
  return (
    <EnhancedRoomProvider 
      id={ROOM_ID}
      initialPresence={{
        viewingWorkflowId: null,
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
      <Workflows />
    </EnhancedRoomProvider>
  );
};

export default LiveWorkflowsRoom;