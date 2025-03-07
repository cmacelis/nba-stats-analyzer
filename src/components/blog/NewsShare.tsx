import * as React from 'react';
import { FaShare, FaTwitter, FaFacebook, FaLink } from 'react-icons/fa';
import Toast from '../shared/Toast';
import { useClickOutside } from '../../hooks/useClickOutside';
import './NewsShare.css';

interface NewsShareProps {
  title: string;
  url: string;
}

const NewsShare: React.FC<NewsShareProps> = ({ title, url }) => {
  const [showOptions, setShowOptions] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  useClickOutside(menuRef, (event) => {
    if (!buttonRef.current?.contains(event.target as Node)) {
      setShowOptions(false);
    }
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowOptions(false);
      buttonRef.current?.focus();
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const buttons = menuRef.current?.querySelectorAll('button');
    if (!buttons) return;

    const currentIndex = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex + 1 >= buttons.length ? 0 : currentIndex + 1;
        buttons[nextIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex - 1 < 0 ? buttons.length - 1 : currentIndex - 1;
        buttons[prevIndex].focus();
        break;
      case 'Tab':
        if (!e.shiftKey && currentIndex === buttons.length - 1) {
          e.preventDefault();
          buttons[0].focus();
        } else if (e.shiftKey && currentIndex === 0) {
          e.preventDefault();
          buttons[buttons.length - 1].focus();
        }
        break;
    }
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setToast({ message: 'Link copied to clipboard!', type: 'success' });
      setShowOptions(false);
    } catch (error) {
      setToast({ message: 'Failed to copy link', type: 'error' });
    }
  };

  return (
    <div className="news-share">
      <button 
        ref={buttonRef}
        className="share-button"
        onClick={() => setShowOptions(!showOptions)}
        aria-label="Share news"
        aria-expanded={showOptions}
        aria-haspopup="true"
      >
        <FaShare />
      </button>
      {showOptions && (
        <div 
          ref={menuRef}
          className="share-options"
          role="menu"
          onKeyDown={handleMenuKeyDown}
          tabIndex={-1}
        >
          <button 
            onClick={shareToTwitter} 
            role="menuitem"
            onKeyDown={handleKeyDown}
          >
            <FaTwitter /> Twitter
          </button>
          <button 
            onClick={shareToFacebook} 
            role="menuitem"
            onKeyDown={handleKeyDown}
          >
            <FaFacebook /> Facebook
          </button>
          <button 
            onClick={copyLink} 
            role="menuitem"
            onKeyDown={handleKeyDown}
          >
            <FaLink /> Copy Link
          </button>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default NewsShare; 