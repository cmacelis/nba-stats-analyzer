import React from 'react';
import { Outlet } from 'react-router-dom';
import { PerformanceProvider } from './contexts/PerformanceContext';
import { AnimationProvider } from './contexts/AnimationContext';
import Layout from './components/Layout';
import { LazyLoad } from './components/common/LazyLoad';
import { ServerStatus } from './components/common/ServerStatus';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useCache } from './hooks/useCache';

function App() {
  useCache();

  return (
    <ErrorBoundary>
      <AnimationProvider>
        <PerformanceProvider>
          <ServerStatus />
          <Layout>
            <LazyLoad>
              <Outlet />
            </LazyLoad>
          </Layout>
        </PerformanceProvider>
      </AnimationProvider>
    </ErrorBoundary>
  );
}

export default App; 