import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Icons for the sidebar menu
const DataCenterHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
    <line x1="6" y1="6" x2="6.01" y2="6"></line>
    <line x1="6" y1="18" x2="6.01" y2="18"></line>
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const WorkflowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

const ValidationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const GoalsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TaskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const MetricsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const menuItems = [
  { path: '/', name: 'Data Center Hub', icon: <DataCenterHubIcon /> },
  { path: '/compliance-chat', name: 'Compliance Chat', icon: <ChatIcon /> },
  { path: '/workflows', name: 'Workflows', icon: <WorkflowIcon /> },
  { path: '/data-validation', name: 'Data Validation', icon: <ValidationIcon /> },
  { path: '/goals', name: 'Goals', icon: <GoalsIcon /> },
  { path: '/task-management', name: 'Task Management', icon: <TaskIcon /> },
  { path: '/visualized-metrics', name: 'Visualized Metrics', icon: <MetricsIcon /> },
];

const Sidebar = () => {
  const location = useLocation();
  
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img 
          src="/ClearDecisions_Logo.png" 
          alt="Clear Decisions Logo" 
          className="logo"
          style={{ 
            maxWidth: '120px', 
            padding: '15px',
            display: 'block',
            margin: '0 auto' 
          }}
        />
      </div>
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  color: location.pathname === item.path ? 'var(--primary-color)' : 'var(--text-primary)',
                  backgroundColor: location.pathname === item.path ? 'rgba(159, 141, 203, 0.1)' : 'transparent',
                  borderLeft: location.pathname === item.path ? '4px solid var(--primary-color)' : '4px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="icon" style={{ marginRight: '12px' }}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;