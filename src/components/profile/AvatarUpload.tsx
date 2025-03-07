import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import DefaultAvatar from '../../assets/default-avatar';
import './AvatarUpload.css';

const AvatarUpload: React.FC = () => {
  const { user, updateUserAvatar } = useAuth();
  const { showToast } = useToast();
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(user?.photoURL || null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      await updateUserAvatar(file);
      showToast('Profile picture updated successfully', 'success');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showToast('Failed to update profile picture', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="avatar-upload">
      <div 
        className={`avatar-container ${isUploading ? 'uploading' : ''}`}
        onClick={handleClick}
      >
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Profile avatar" 
            className="avatar-image"
          />
        ) : (
          <DefaultAvatar />
        )}
        {isUploading && (
          <div className="upload-overlay">
            <span className="upload-text">Uploading...</span>
          </div>
        )}
        <div className="hover-overlay">
          <span className="change-text">Change Picture</span>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AvatarUpload; 