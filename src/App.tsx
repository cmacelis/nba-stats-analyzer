import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import PlayerComparison from './components/players/PlayerComparison';
import NotFound from './components/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import FirebaseTest from './components/FirebaseTest';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route 
              path="/" 
              element={
                <Navigate to="/dashboard" replace />
              } 
            />
            <Route 
              path="/login" 
              element={
                <Login />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  {console.log('Rendering Dashboard')}
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/compare" 
              element={
                <ProtectedRoute>
                  {console.log('Rendering PlayerComparison')}
                  <PlayerComparison />
                </ProtectedRoute>
              } 
            />
            <Route path="/test" element={<FirebaseTest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App; 