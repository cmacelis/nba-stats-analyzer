import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../LoadingSpinner';
import './ComparisonHistory.css';

interface ComparisonRecord {
  id: string;
  date: string;
  player1: {
    name: string;
    team: string;
  };
  player2: {
    name: string;
    team: string;
  };
}

const ComparisonHistory: React.FC = () => {
  const [history, setHistory] = React.useState<ComparisonRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadHistory = async () => {
      try {
        // TODO: Load comparison history from backend
        setHistory([]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading history:', error);
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="comparison-history">
      <h3>Recent Comparisons</h3>
      {history.length === 0 ? (
        <p className="no-history">No comparison history yet</p>
      ) : (
        <div className="history-list">
          {history.map(record => (
            <div key={record.id} className="history-card">
              <div className="comparison-info">
                <div className="players">
                  <span>{record.player1.name}</span>
                  <span className="vs">vs</span>
                  <span>{record.player2.name}</span>
                </div>
                <div className="date">{new Date(record.date).toLocaleDateString()}</div>
              </div>
              <button
                className="view-button"
                onClick={() => navigate(`/compare?id=${record.id}`)}
              >
                View Comparison
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComparisonHistory; 