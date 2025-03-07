import * as React from 'react';
import './InteractiveFeatures.css';

interface CustomStat {
  id: string;
  name: string;
  formula: string;
}

interface SavedComparison {
  id: string;
  date: string;
  players: string[];
}

const InteractiveFeatures: React.FC = () => {
  const [customStats, setCustomStats] = React.useState<CustomStat[]>([]);
  const [savedComparisons, setSavedComparisons] = React.useState<SavedComparison[]>([]);

  const handleAddCustomStat = () => {
    // Implementation
  };

  const handleSaveComparison = () => {
    // Implementation
  };

  return (
    <div className="interactive-features">
      <div className="custom-stats-builder">
        <h3>Custom Stats Builder</h3>
        <button onClick={handleAddCustomStat}>Add Custom Stat</button>
      </div>
      <div className="saved-comparisons">
        <h3>Saved Comparisons</h3>
        <button onClick={handleSaveComparison}>Save Current Comparison</button>
      </div>
    </div>
  );
};

export default InteractiveFeatures; 