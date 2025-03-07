import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getUserPreferences, updateUserPreferences } from '../../services/userService';
import type { UserPreferences } from '../../types/user';
import './PreferencesManager.css';

export const PreferencesManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [preferences, setPreferences] = React.useState<UserPreferences>({
    theme: 'light',
    notifications: true,
    favoriteTeams: [],
    statsDisplay: 'advanced'
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      try {
        const userPrefs = await getUserPreferences(user.uid);
        setPreferences(userPrefs);
      } catch (error) {
        showToast('Failed to load preferences', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, showToast]);

  const savePreferences = async () => {
    try {
      await updateUserPreferences(user.uid, preferences);
      showToast('Preferences saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save preferences', 'error');
    }
  };

  if (loading) {
    return <div>Loading preferences...</div>;
  }

  if (!preferences) {
    return <div>No preferences found</div>;
  }

  return (
    <div className="preferences-manager">
      <h2>User Preferences</h2>
      {/* Add preference sections */}
      <button onClick={savePreferences}>Save Preferences</button>
    </div>
  );
};

export default PreferencesManager; 