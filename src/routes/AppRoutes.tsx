import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Component imports
import Login from '../components/auth/Login';
import Dashboard from '../components/Dashboard';
import PlayerComparison from '../components/players/PlayerComparison';
import HistoricalDataView from '../components/players/HistoricalDataView';
import AIPredictionView from '../components/predictions/AIPredictionView';
import NBANewsView from '../components/blog/NBANewsView';
import UserProfile from '../components/profile/UserProfile';
import NotFound from '../components/NotFound';
import PreferencesManager from '../components/profile/PreferencesManager';
import ThemeSettings from '../components/profile/ThemeSettings';
import ComparisonHistory from '../components/profile/ComparisonHistory';
import FavoritePlayers from '../components/profile/FavoritePlayers';

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/compare" element={
        <ProtectedRoute>
          <PlayerComparison />
        </ProtectedRoute>
      } />

      <Route path="/historical" element={
        <ProtectedRoute>
          <HistoricalDataView />
        </ProtectedRoute>
      } />

      <Route path="/predictions/:playerId" element={
        <ProtectedRoute>
          <AIPredictionView />
        </ProtectedRoute>
      } />

      <Route path="/news" element={
        <ProtectedRoute>
          <NBANewsView />
        </ProtectedRoute>
      } />

      {/* Profile Routes */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <UserProfile />
        </ProtectedRoute>
      } />

      <Route path="/profile/preferences" element={
        <ProtectedRoute>
          <PreferencesManager />
        </ProtectedRoute>
      } />

      <Route path="/profile/theme" element={
        <ProtectedRoute>
          <ThemeSettings />
        </ProtectedRoute>
      } />

      <Route path="/profile/history" element={
        <ProtectedRoute>
          <ComparisonHistory />
        </ProtectedRoute>
      } />

      <Route path="/profile/favorites" element={
        <ProtectedRoute>
          <FavoritePlayers />
        </ProtectedRoute>
      } />

      {/* Public Routes */}
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <Login />
      } />

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes; 