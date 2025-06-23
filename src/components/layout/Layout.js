import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <Header />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;