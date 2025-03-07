import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './UserProfile.css';

interface UserProfileProps {
  onSignOut: () => Promise<void>;
}

const UserProfile = ({ onSignOut }: UserProfileProps): JSX.Element => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-profile" ref={profileRef}>
      <button 
        className="profile-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <FaUser />
        <span>{currentUser?.email}</span>
      </button>

      {isOpen && (
        <div className="profile-dropdown">
          <div className="profile-header">
            <FaUser className="profile-avatar" />
            <div className="profile-info">
              <span className="profile-name">{currentUser?.email}</span>
              <span className="profile-email">Member since {new Date(currentUser?.metadata.creationTime).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="profile-menu">
            <button className="profile-item">
              <FaCog />
              <span>Settings</span>
            </button>
            <button className="profile-item sign-out" onClick={onSignOut}>
              <FaSignOutAlt />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile; 