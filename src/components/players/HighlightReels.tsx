import * as React from 'react';
import { Player } from '../../types/nba';
import { FaPlay, FaExternalLinkAlt } from 'react-icons/fa';
import './HighlightReels.css';

interface HighlightReelsProps {
  player: Player;
  season: string;
}

interface Highlight {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  date: string;
  views: number;
}

const HighlightReels: React.FC<HighlightReelsProps> = ({
  player,
  season
}) => {
  const [highlights, setHighlights] = React.useState<Highlight[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedVideo, setSelectedVideo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchHighlights = async () => {
      try {
        setLoading(true);
        // In a real app, fetch from YouTube API or your highlights database
        const mockHighlights: Highlight[] = [
          {
            id: '1',
            title: `${player.fullName} Best Plays ${season}`,
            thumbnail: 'path/to/thumbnail1.jpg',
            videoUrl: 'https://youtube.com/watch?v=...',
            date: '2024-01-15',
            views: 50000
          },
          // Add more mock highlights
        ];
        setHighlights(mockHighlights);
      } catch (error) {
        console.error('Error fetching highlights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, [player.fullName, season]);

  return (
    <div className="highlight-reels">
      <h3>Season Highlights</h3>
      
      {selectedVideo ? (
        <div className="video-player">
          <iframe
            src={selectedVideo}
            title="Highlight Video"
            frameBorder="0"
            allowFullScreen
          />
          <button 
            className="close-video"
            onClick={() => setSelectedVideo(null)}
          >
            Close
          </button>
        </div>
      ) : (
        <div className="highlights-grid">
          {highlights.map(highlight => (
            <div key={highlight.id} className="highlight-card">
              <div 
                className="thumbnail"
                style={{ backgroundImage: `url(${highlight.thumbnail})` }}
                onClick={() => setSelectedVideo(highlight.videoUrl)}
              >
                <div className="play-button">
                  <FaPlay />
                </div>
              </div>
              <div className="highlight-info">
                <h4>{highlight.title}</h4>
                <div className="highlight-meta">
                  <span>{new Date(highlight.date).toLocaleDateString()}</span>
                  <span>{highlight.views.toLocaleString()} views</span>
                </div>
                <a 
                  href={highlight.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  Watch on YouTube <FaExternalLinkAlt />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightReels; 