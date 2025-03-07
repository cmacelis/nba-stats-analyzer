import * as React from 'react';
import type { FilterOptions } from '../../types/nba';
import { FILTER_PRESETS } from '../../utils/filterPresets';
import './FilterPanel.css';

interface FilterPanelProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters?: FilterOptions;
}

type Position = 'All' | 'G' | 'F' | 'C' | 'G-F' | 'F-C';
type Conference = 'All' | 'East' | 'West';
type Experience = 'All' | 'rookie' | 'sophomore' | 'veteran';

const POSITIONS: Position[] = ['All', 'G', 'F', 'C', 'G-F', 'F-C'];
const CONFERENCES: Conference[] = ['All', 'East', 'West'];
const EXPERIENCE_LEVELS: Experience[] = ['All', 'rookie', 'sophomore', 'veteran'];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onFilterChange,
  initialFilters
}) => {
  const [filters, setFilters] = React.useState<FilterOptions>(
    initialFilters || {
      position: 'All',
      conference: 'All',
      experience: 'All',
      sortBy: 'points',
      sortOrder: 'desc'
    }
  );

  const handleFilterChange = React.useCallback((key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  const handlePresetSelect = React.useCallback((presetId: string) => {
    const preset = FILTER_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFilters(preset.filters);
      onFilterChange(preset.filters);
    }
  }, [onFilterChange]);

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <label htmlFor="position">Position</label>
        <select
          id="position"
          value={filters.position}
          onChange={(e) => handleFilterChange('position', e.target.value)}
        >
          {POSITIONS.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>
      {/* Add other filter sections */}
    </div>
  );
};

export default FilterPanel; 