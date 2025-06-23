// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react'; // ✅ ADD THIS
import App from './App';

// You can even move domain and clientId to env vars later.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-2sqzvgejnwhp8a3e.us.auth0.com"
      clientId="rnipYiMM9azbvZyxQ7Lfcw3Qyv6MDDYr"
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: "openid profile email"
      }}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
