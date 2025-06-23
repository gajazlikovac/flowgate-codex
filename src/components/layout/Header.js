// src/components/layout/Header.js
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useProfile } from '../../context/ProfileContext'; // ✅ Import ProfileContext

const getPageTitle = (pathname) => {
  switch (pathname) {
    case '/':
      return 'Data Center Hub';
    case '/dashboard':
      return 'Dashboard';
    case '/compliance-chat':
      return 'Compliance Chat';
    case '/workflows':
      return 'Workflows';
    case '/data-validation':
      return 'Data Validation';
    case '/goals':
      return 'Goals';
    case '/task-management':
      return 'Task Management';
    case '/visualized-metrics':
      return 'Visualized Metrics';
    case '/settings':
      return 'Account Settings';
    default:
      return 'Data Center Hub';
  }
};

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const Header = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth0();
  const { customAvatar } = useProfile(); // ✅ Get custom avatar
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    logout({
      logoutParams: { returnTo: window.location.origin },
    });
  };

  const getDisplayName = () => {
    if (!user) return '';
    if (user.given_name) return user.given_name;
    if (user.name && !user.name.includes('@')) return user.name;
    return 'User'; // fallback
  };

  return (
    <div className="header" style={{ position: 'relative' }}>
      {/* Logo */}
      <div className="header-logo" style={{ marginRight: 'auto' }}>
        <img src="/equinix-logo.png" alt="Equinix Logo" style={{ height: '30px' }} />
      </div>

      {/* Page title */}
      <div className="header-title" style={{ marginRight: 'auto', fontSize: 'var(--font-size-lg)', fontWeight: '500' }}>
        Compliance and Sustainability Analysis - {pageTitle}
      </div>

      {/* Search */}
      <div className="header-search" style={{ display: 'flex', alignItems: 'center', marginRight: '24px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '12px' }}>
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 12px 8px 40px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            fontSize: 'var(--font-size-sm)',
            width: '250px'
          }}
        />
      </div>

      {/* Notifications */}
      <div className="header-notification" style={{ marginRight: '24px', position: 'relative' }}>
        <button style={{ background: 'none', border: 'none', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
          <BellIcon />
        </button>
        <span style={{
          position: 'absolute',
          top: '0',
          right: '0',
          backgroundColor: 'var(--error-color)',
          color: 'white',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          3
        </span>
      </div>

      {/* User Info */}
      <div className="header-user" style={{ position: 'relative' }}>
        {isAuthenticated && user ? (
          <div 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: 'var(--background-light)', 
              padding: '6px 12px', 
              borderRadius: '20px', 
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
          >
            <span style={{ marginRight: '8px', fontSize: 'var(--font-size-sm)' }}>
              Welcome, {getDisplayName()}!
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden' }}>
              <img src={customAvatar || user?.picture || '/default-avatar.png'} alt="User avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        ) : (
          <div>Loading user...</div>
        )}

        {/* Mini flyout menu */}
        {menuOpen && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '60px',
            backgroundColor: 'var(--background-white)',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            minWidth: '150px',
            zIndex: 1000,
          }}>
            <Link 
              to="/settings"
              onClick={() => setMenuOpen(false)}
              style={{ 
                display: 'block', 
                padding: '10px', 
                color: 'var(--text-primary)', 
                textDecoration: 'none',
                fontSize: '14px'
              }}
            >
              Account Settings
            </Link>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '10px',
                textAlign: 'left',
                fontSize: '14px',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
