import React, { useEffect, useState } from 'react';
import { auth } from '../config/firebase';

const FirebaseTest: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        // Test Firebase initialization
        await auth.app.options;
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    checkFirebase();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Firebase Configuration Test</h2>
      {status === 'loading' && <p>Testing Firebase configuration...</p>}
      {status === 'success' && (
        <div style={{ color: 'green' }}>
          ✅ Firebase is properly configured
          <pre>
            Project ID: {auth.app.options.projectId}
          </pre>
        </div>
      )}
      {status === 'error' && (
        <div style={{ color: 'red' }}>
          ❌ Firebase configuration error:
          <pre>{error}</pre>
        </div>
      )}
    </div>
  );
};

export default FirebaseTest; 