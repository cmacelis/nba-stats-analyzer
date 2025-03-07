import * as React from 'react';
import { useToast } from '../../contexts/ToastContext';
import './StatPreferences.css';

interface StatPreference {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
}

const StatPreferences: React.FC = () => {
  const { showToast } = useToast();
  const [preferences, setPreferences] = React.useState<StatPreference[]>([
    { id: 'points', name: 'Points', enabled: true, priority: 1 },
    { id: 'assists', name: 'Assists', enabled: true, priority: 2 },
    { id: 'rebounds', name: 'Rebounds', enabled: true, priority: 3 },
    { id: 'steals', name: 'Steals', enabled: true, priority: 4 },
    { id: 'blocks', name: 'Blocks', enabled: true, priority: 5 },
    { id: 'per', name: 'Player Efficiency Rating', enabled: true, priority: 6 }
  ]);

  const handleToggle = (id: string) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const handleSave = async () => {
    try {
      // TODO: Save to backend
      showToast('Preferences saved successfully', 'success');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast('Failed to save preferences', 'error');
    }
  };

  return (
    <div className="stat-preferences">
      <h3>Customize Stats Display</h3>
      <p className="description">
        Select which statistics you want to see in comparisons and analysis
      </p>

      <div className="preferences-list">
        {preferences.map(pref => (
          <div key={pref.id} className="preference-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={pref.enabled}
                onChange={() => handleToggle(pref.id)}
              />
              <span className="toggle-text">{pref.name}</span>
            </label>
          </div>
        ))}
      </div>

      <button className="save-button" onClick={handleSave}>
        Save Preferences
      </button>
    </div>
  );
};

export default StatPreferences; 