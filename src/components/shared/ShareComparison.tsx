import * as React from 'react';
import { FaShare, FaTwitter, FaFacebook, FaLink } from 'react-icons/fa';
import './ShareComparison.css';

interface ShareComparisonProps {
  player1: string;
  player2: string;
  stats: {
    per: { player1: number; player2: number };
    winShares: { player1: number; player2: number };
  };
}

const ShareComparison: React.FC<ShareComparisonProps> = ({ player1, player2, stats }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const shareText = `Comparing ${player1} vs ${player2}: 
    PER (${stats.per.player1.toFixed(1)} vs ${stats.per.player2.toFixed(1)}) 
    Win Shares (${stats.winShares.player1.toFixed(1)} vs ${stats.winShares.player2.toFixed(1)})`;

  const shareUrl = window.location.href;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="share-comparison">
      <button className="share-button" onClick={copyToClipboard}>
        <FaLink />
        <span>Copy Link</span>
        {showTooltip && <div className="tooltip">Copied!</div>}
      </button>
      <button className="share-button twitter" onClick={shareToTwitter}>
        <FaTwitter />
        <span>Tweet</span>
      </button>
      <button className="share-button facebook" onClick={shareToFacebook}>
        <FaFacebook />
        <span>Share</span>
      </button>
    </div>
  );
};

export default ShareComparison; 