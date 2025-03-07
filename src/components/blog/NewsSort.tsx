import * as React from 'react';
import './NewsSort.css';

interface NewsSortProps {
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

const NewsSort: React.FC<NewsSortProps> = ({ onSortChange }) => {
  const [sortBy, setSortBy] = React.useState('date');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value);
    onSortChange(event.target.value, sortOrder);
  };

  const handleOrderChange = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    onSortChange(sortBy, newOrder);
  };

  return (
    <div className="news-sort">
      <select value={sortBy} onChange={handleSortChange}>
        <option value="date">Date</option>
        <option value="relevance">Relevance</option>
      </select>
      <button onClick={handleOrderChange}>
        {sortOrder === 'desc' ? '↓' : '↑'}
      </button>
    </div>
  );
};

export default NewsSort; 