import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import './MobileMenu.css';

interface NavLink {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileMenuProps {
  links: NavLink[];
  onSignOut: () => Promise<void>;
}

const MobileMenu = ({ links, onSignOut }: MobileMenuProps): JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (path: string): void => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="mobile-menu" ref={menuRef}>
      <button 
        className="menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {isOpen && (
        <div className="menu-overlay">
          <div className="menu-content">
            {links.map(({ path, label, icon }) => (
              <button
                key={path}
                onClick={() => handleNavigation(path)}
                className="menu-item"
                aria-label={label}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
            <button 
              onClick={onSignOut}
              className="menu-item sign-out"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu; 