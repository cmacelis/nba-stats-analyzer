import * as React from 'react';
import { FaSearch } from 'react-icons/fa';
import { useDebounce } from '../../hooks/useDebounce';
import './NewsSearch.css';

interface NewsSearchProps {
  onSearch: (query: string) => void;
}

const NewsSearch: React.FC<NewsSearchProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  React.useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  return (
    <div className="news-search">
      <div className="search-input-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search news..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );
};

export default NewsSearch; 