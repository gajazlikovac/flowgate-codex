import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '../context/CustomAuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import '../styles/auth.css';

const LoginPage = () => {
  const { login, register } = useCustomAuth();
  const { loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (e) {
      setError('Authentication failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-info">
        <h1>Welcome Back</h1>
        <p>Manage your compliance with ease.</p>
      </div>
      <div className="auth-box">
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>{isRegister ? 'Register' : 'Login'}</h2>
          {error && <p className="error-text">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
          <button
            type="button"
            className="btn btn-accent auth0-button"
            onClick={() => loginWithRedirect()}
          >
            Login with Auth0
          </button>
          <p className="toggle-text">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <span onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? ' Login' : ' Register'}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
