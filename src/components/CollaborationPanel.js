// src/components/CollaborationPanel.js
import React from 'react';
import { useOthers } from '../liveblocks.config';

const CollaborationPanel = ({ className }) => {
  const others = useOthers();
  
  if (others.length === 0) {
    return null;
  }
  
  return (
    <div className={`collaboration-panel ${className || ''}`} style={{
      backgroundColor: "#f0f8ff", 
      padding: "12px",
      borderRadius: "8px",
      marginBottom: "16px"
    }}>
      <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
        {others.length} {others.length === 1 ? 'person' : 'people'} currently collaborating
      </h3>
      <div style={{ display: "flex", gap: "10px" }}>
        {others.map(user => (
          <div key={user.connectionId} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: user.presence.color || "#2196f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px"
            }}>
              {user.info?.name ? user.info.name.charAt(0).toUpperCase() : "?"}
            </div>
            <span style={{ fontSize: "12px", marginTop: "4px" }}>
              {user.info?.name || "Anonymous"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollaborationPanel;