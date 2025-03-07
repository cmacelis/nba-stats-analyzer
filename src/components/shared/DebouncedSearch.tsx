import React, { useState, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { FaSearch, FaTimes } from 'react-icons/fa';
import './DebouncedSearch.css';

interface DebouncedSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  delay?: number;
  minChars?: number;
}

export const DebouncedSearch: React.FC<DebouncedSearchProps> = ({
  onSearch,
  placeholder = 'Search...',
  delay = 300,
  minChars = 2
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, delay);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  React.useEffect(() => {
    if (debouncedQuery.length >= minChars) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, minChars, onSearch]);

  return (
    <div className="debounced-search">
      <FaSearch className="search-icon" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {query && (
        <button onClick={clearSearch} className="clear-button">
          <FaTimes />
        </button>
      )}
    </div>
  );
}; 