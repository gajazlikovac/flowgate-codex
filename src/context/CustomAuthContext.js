import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const CustomAuthContext = createContext();

export const useCustomAuth = () => useContext(CustomAuthContext);

export const CustomAuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('customUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('customToken'));

  useEffect(() => {
    if (user) {
      localStorage.setItem('customUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('customUser');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('customToken', token);
    } else {
      localStorage.removeItem('customToken');
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('/api/login', { email, password });
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const register = async (email, password) => {
    const res = await axios.post('/api/register', { email, password });
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const logout = async () => {
    try {
      await axios.post(
        '/api/logout',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      // ignore errors
    }
    setUser(null);
    setToken(null);
  };

  return (
    <CustomAuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </CustomAuthContext.Provider>
  );
};
