import * as React from 'react';
import Navigation from '../shared/Navigation';
import NBABlog from './NBABlog';
import './NBANewsView.css';

const NBANewsView: React.FC = () => {
  return (
    <div className="nba-news-view">
      <Navigation />
      <div className="content">
        <header>
          <h1>NBA News & Updates</h1>
          <p>AI-powered news and analysis from across the league</p>
        </header>
        <NBABlog />
      </div>
    </div>
  );
};

export default NBANewsView; 