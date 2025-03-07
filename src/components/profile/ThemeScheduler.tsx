import * as React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './ThemeScheduler.css';
import { ThemeData } from '../../types/common';

interface Schedule {
  id: string;
  name: string;
  theme: ThemeData;
  startTime: string;
  endTime: string;
  days: string[];
  enabled: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ThemeScheduler: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [editingSchedule, setEditingSchedule] = React.useState<Schedule | null>(null);

  const handleAddSchedule = () => {
    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      name: 'New Schedule',
      theme: {
        primary: '#1e3c72',
        secondary: '#2a5298',
        background: '#ffffff',
        text: '#333333'
      },
      startTime: '09:00',
      endTime: '17:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      enabled: true
    };
    setSchedules(prev => [...prev, newSchedule]);
  };

  const handleSaveSchedule = (schedule: Schedule) => {
    setSchedules(prev => 
      prev.map(s => s.id === schedule.id ? schedule : s)
    );
    setEditingSchedule(null);
    showToast('Schedule saved successfully', 'success');
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    showToast('Schedule deleted', 'success');
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules(prev => 
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
  };

  React.useEffect(() => {
    if (user) {
      // Load schedules from backend
      // This is a placeholder for the actual implementation
      setSchedules([]);
    }
  }, [user]);

  return (
    <div className="theme-scheduler">
      <header>
        <h2>Theme Scheduler</h2>
        <p>Automatically switch themes based on time and day</p>
      </header>

      <div className="schedules-list">
        {schedules.map(schedule => (
          <div key={schedule.id} className="schedule-item">
            <div className="schedule-header">
              <h3>{schedule.name}</h3>
              <div className="schedule-controls">
                <button
                  className={`toggle-button ${schedule.enabled ? 'enabled' : ''}`}
                  onClick={() => handleToggleSchedule(schedule.id)}
                >
                  {schedule.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  className="edit-button"
                  onClick={() => setEditingSchedule(schedule)}
                >
                  Edit
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteSchedule(schedule.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="schedule-details">
              <div className="time-range">
                {schedule.startTime} - {schedule.endTime}
              </div>
              <div className="days">
                {DAYS.map(day => (
                  <span
                    key={day}
                    className={`day ${schedule.days.includes(day) ? 'active' : ''}`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button className="add-schedule" onClick={handleAddSchedule}>
          Add Schedule
        </button>
      </div>
    </div>
  );
};

export default ThemeScheduler; 