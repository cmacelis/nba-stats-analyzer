import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBookmarkedNews } from '../../services/newsService';
import { getUserHistory } from '../../services/userService';
import Navigation from '../shared/Navigation';
import NewsCard from '../blog/NewsCard';
import './UserProfile.css';
import NotificationCenter from './NotificationCenter';
import { LoadingSpinner } from '../LoadingSpinner';

interface UserHistory {
  id: string;
  type: string;
  timestamp: string;
  details: Record<string, unknown>;
}

interface BookmarkedNews {
  id: string;
  title: string;
  content: string;
  date: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = React.useState<UserHistory[]>([]);
  const [bookmarks, setBookmarks] = React.useState<BookmarkedNews[]>([]);
  const [activeTab, setActiveTab] = React.useState('history');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleError = React.useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setError(errorMessage);
    console.error('Error in UserProfile:', error);
  }, []);

  const fetchUserData = React.useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const [historyData, bookmarksData] = await Promise.all([
        getUserHistory(user.uid),
        getBookmarkedNews(user.uid)
      ]);
      
      setHistory(historyData);
      setBookmarks(bookmarksData);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, handleError]);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  if (!user) return null;

  return (
    <div className="user-profile">
      <Navigation />
      <div className="profile-content">
        <header>
          <h1>Profile</h1>
          <div className="user-info">
            <img 
              src={user.photoURL || '/default-avatar.png'} 
              alt="Profile" 
              className="profile-avatar"
            />
            <div>
              <h2>{user.displayName}</h2>
              <p>{user.email}</p>
            </div>
          </div>
        </header>

        <NotificationCenter />

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="profile-tabs">
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button 
            className={`tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            Bookmarks
          </button>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="tab-content">
            {activeTab === 'history' && (
              <div className="history-list">
                {history.map(item => (
                  <div key={item.id} className="history-item">
                    <span className="timestamp">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    <span className="type">{item.type}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div className="bookmarks-list">
                {bookmarks.map(news => (
                  <NewsCard 
                    key={news.id}
                    news={news}
                    onBookmark={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 