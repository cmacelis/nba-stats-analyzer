import * as React from 'react';
import './NewsCard.css';
import NewsShare from './NewsShare';

interface NewsCardProps {
  news: {
    title: string;
    content: string;
    source: string;
    publishedAt: string;
    imageUrl?: string;
    category: string;
    aiAnalysis?: string;
    id: string;
    bookmarked: boolean;
  };
  onBookmark: (id: string) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ news, onBookmark }) => {
  const [showAnalysis, setShowAnalysis] = React.useState(false);

  // Simple date formatter function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="news-card">
      {news.imageUrl && (
        <div className="news-image">
          <img src={news.imageUrl} alt={news.title} />
        </div>
      )}
      <div className="news-content">
        <h3>{news.title}</h3>
        <div className="news-meta">
          <span className="source">{news.source}</span>
          <span className="date">{formatDate(news.publishedAt)}</span>
          <span className="category">{news.category}</span>
        </div>
        <p className="news-text">{news.content}</p>
        {news.aiAnalysis && (
          <div className="ai-analysis">
            <button 
              className="analysis-toggle"
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              {showAnalysis ? 'Hide Analysis' : 'Show AI Analysis'}
            </button>
            {showAnalysis && (
              <div className="analysis-content">
                {news.aiAnalysis}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="news-actions">
        <button 
          className="bookmark-button"
          onClick={() => onBookmark(news.id)}
        >
          {news.bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
        <NewsShare 
          title={news.title}
          url={window.location.origin + '/news/' + news.id}
        />
      </div>
    </div>
  );
};

export default NewsCard; 