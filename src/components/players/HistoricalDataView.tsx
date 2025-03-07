import * as React from 'react';
import Navigation from '../shared/Navigation';
import HistoricalDataViewer from './HistoricalDataViewer';
import './HistoricalDataView.css';

const HistoricalDataView: React.FC = () => {
  return (
    <div className="historical-data-view">
      <Navigation />
      <div className="content">
        <header>
          <h1>Historical Player Data</h1>
          <p>Comprehensive historical statistics and analysis for NBA players</p>
        </header>
        <HistoricalDataViewer />
      </div>
    </div>
  );
};

export default HistoricalDataView; 