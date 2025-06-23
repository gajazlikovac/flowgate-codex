import React from 'react';
import { EnhancedRoomProvider } from '../../liveblocks';
import WorkflowWizard from '../WorkflowWizard';
import { useAuth0 } from '@auth0/auth0-react';

// Simplified component - just provides the room context
const LiveWorkflowsWizardRoom = () => {
  const { user } = useAuth0();
  const ROOM_ID = "workflows-wizard";
  
  return (
    <EnhancedRoomProvider 
      id={ROOM_ID}
      initialPresence={{
        viewingQuestionId: null,
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
      }}
    >
      {/* Direct render - no intermediate component */}
      <WorkflowWizard />
    </EnhancedRoomProvider>
  );
};

export default LiveWorkflowsWizardRoom;