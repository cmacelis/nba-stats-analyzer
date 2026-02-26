import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CssBaseline from '@mui/material/CssBaseline';
import { SoundProvider } from './contexts/SoundContext';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';
const Home = React.lazy(() => import('./pages/Home'));
const PlayerComparison = React.lazy(() => import('./pages/PlayerComparison'));
const GamePredictor = React.lazy(() => import('./pages/GamePredictor'));
const PerformanceDashboard = React.lazy(() => import('./pages/PerformanceDashboard'));
const EdgeDetector = React.lazy(() => import('./pages/EdgeDetector'));
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

// Remove any previously registered service worker — no SW file exists in this project
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'compare',
        element: <PlayerComparison />
      },
      {
        path: 'predict',
        element: <GamePredictor />
      },
      {
        path: 'performance',
        element: <PerformanceDashboard />
      },
      {
        path: 'edge',
        element: <EdgeDetector />
      }
    ]
  }
], {
  future: {
    v7_relativeSplatPath: true
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CssBaseline />
        <SoundProvider>
          <RouterProvider router={router} />
        </SoundProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
