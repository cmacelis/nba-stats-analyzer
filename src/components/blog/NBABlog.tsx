import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../LoadingSpinner';
import NewsCard from './NewsCard';
import NewsFilter from './NewsFilter';
import NewsSearch from './NewsSearch';
import { fetchNBANews, bookmarkNews, getTrendingNews } from '../../services/newsService';
import './NBABlog.css';

const NBABlog: React.FC = () => {
  const { user } = useAuth();
  const [news, setNews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({
    categories: [],
    teams: [],
    players: [],
    sortBy: 'date',
    sortOrder: 'desc',
    searchQuery: ''
  });
  const [trendingNews, setTrendingNews] = React.useState([]);

  const loadNews = React.useCallback(async () => {
    setLoading(true);
    try {
      const [newsData, trending] = await Promise.all([
        fetchNBANews(filters),
        getTrendingNews()
      ]);
      setNews(newsData);
      setTrendingNews(trending);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleBookmark = async (newsId: string) => {
    if (user) {
      const success = await bookmarkNews(newsId, user.uid);
      if (success) {
        // Update UI to reflect bookmarked state
        setNews(prev => 
          prev.map(item => 
            item.id === newsId 
              ? { ...item, bookmarked: !item.bookmarked }
              : item
          )
        );
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="nba-blog">
      <NewsSearch onSearch={handleSearch} />
      <div className="blog-layout">
        <aside className="blog-sidebar">
          <NewsFilter onFilterChange={handleFilterChange} />
          <div className="trending-news">
            <h3>Trending News</h3>
            {trendingNews.map(item => (
              <div key={item.id} className="trending-item">
                <h4>{item.title}</h4>
                <span className="trending-source">{item.source}</span>
              </div>
            ))}
          </div>
        </aside>
        <main className="news-content">
          {news.map(item => (
            <NewsCard 
              key={item.id} 
              news={item}
              onBookmark={() => handleBookmark(item.id)}
            />
          ))}
        </main>
      </div>
    </div>
  );
};

export default NBABlog; 