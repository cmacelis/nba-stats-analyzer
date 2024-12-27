import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>CourtVision</h1>
        <p>NBA Stats Analyzer</p>
        <button onClick={handleGoogleSignIn} className="google-sign-in">
          Sign in with Google
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default Login; 