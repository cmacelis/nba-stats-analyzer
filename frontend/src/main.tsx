import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SoundProvider } from './contexts/SoundContext';
import { lightTheme } from './utils/theme';
import App from './App';
const Home = React.lazy(() => import('./pages/Home'));
const PlayerComparison = React.lazy(() => import('./pages/PlayerComparison'));
const GamePredictor = React.lazy(() => import('./pages/GamePredictor'));
const PerformanceDashboard = React.lazy(() => import('./pages/PerformanceDashboard'));
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { register } from './utils/serviceWorkerRegistration';

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
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <SoundProvider>
          <RouterProvider router={router} />
        </SoundProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// Register service worker
register({
  onSuccess: (registration) => {
    console.log('Service Worker registered successfully:', registration);
  },
  onUpdate: (_registration) => {
    console.log('New version available. Please refresh the page.');
    // You could show a notification to the user here
  },
});