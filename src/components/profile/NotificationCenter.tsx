import * as React from 'react';
import { Notification, getNotifications, markNotificationAsRead } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import './NotificationCenter.css';

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadNotifications = async () => {
      if (user) {
        const data = await getNotifications(user.uid);
        setNotifications(data);
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (user) {
      const success = await markNotificationAsRead(user.uid, notificationId);
      if (success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    }
  };

  return (
    <div className="notification-center">
      <h2>Notifications</h2>
      {loading ? (
        <div className="loading">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">No notifications</div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
            >
              <div className="notification-content">
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <span className="notification-time">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </div>
              {!notification.read && (
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="mark-read-button"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 