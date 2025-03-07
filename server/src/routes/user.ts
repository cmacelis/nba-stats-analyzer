import express from 'express';
import { createEndpointLimiter } from '../utils/rateLimiter';
import { emailQueueService } from '../services/emailQueueService';
import { streakService } from '../services/streakService';

const router = express.Router();

interface User {
  uid: string;
  email: string;
  displayName: string | null;
}

interface ComparisonItem {
  id: string;
  date: string;
  player1: {
    id: string;
    name: string;
    stats: any;
  };
  player2: {
    id: string;
    name: string;
    stats: any;
  };
  notes?: string;
}

interface Notification {
  id: string;
  userId: string;
  type: 'achievement' | 'news' | 'game' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface UserPreferences {
  favoriteTeams: string[];
  notifications: {
    email: {
      news: boolean;
      gameAlerts: boolean;
      playerUpdates: boolean;
      achievements: boolean;
    };
    push: {
      news: boolean;
      gameAlerts: boolean;
      playerUpdates: boolean;
      achievements: boolean;
    };
  };
  theme: 'light' | 'dark';
  emailFrequency: 'instant' | 'daily' | 'weekly';
}

// Mock data storage (replace with database in production)
const userHistory = new Map<string, ComparisonItem[]>();
const userPreferences = new Map<string, UserPreferences>();
const userNotifications = new Map<string, Notification[]>();
const userAchievements = new Map();
const userBookmarks = new Map<string, string[]>();

// Mock achievements data
const ACHIEVEMENTS = [
  {
    id: 'compare-10',
    title: 'Comparison Expert',
    description: 'Compare 10 different player pairs',
    icon: '/icons/compare.svg',
    requirement: 10
  },
  {
    id: 'bookmark-20',
    title: 'News Collector',
    description: 'Bookmark 20 news articles',
    icon: '/icons/bookmark.svg',
    requirement: 20
  },
  {
    id: 'daily-streak',
    title: 'Daily Analyst',
    description: 'Visit the site for 7 consecutive days',
    icon: '/icons/streak.svg',
    requirement: 7
  },
  {
    id: 'daily-streak-7',
    title: 'Weekly Warrior',
    description: 'Visit the site for 7 consecutive days',
    icon: '/icons/streak-7.svg',
    requirement: 7
  },
  {
    id: 'daily-streak-30',
    title: 'Monthly Maven',
    description: 'Visit the site for 30 consecutive days',
    icon: '/icons/streak-30.svg',
    requirement: 30
  },
  {
    id: 'longest-streak-100',
    title: 'Streak Legend',
    description: 'Achieve a 100-day visit streak',
    icon: '/icons/streak-100.svg',
    requirement: 100
  }
];

const userLimiter = createEndpointLimiter(15, 100);

router.get('/:userId/history', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const history = userHistory.get(userId) || [];
    res.json(history);
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ error: 'Failed to fetch user history' });
  }
});

router.post('/:userId/history', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const comparison: ComparisonItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...req.body
    };

    if (!userHistory.has(userId)) {
      userHistory.set(userId, []);
    }

    const history = userHistory.get(userId)!;
    history.unshift(comparison);
    
    // Track achievement progress
    await checkAchievements(userId, 'comparison');
    
    res.json(comparison);
  } catch (error) {
    console.error('Error saving comparison:', error);
    res.status(500).json({ error: 'Failed to save comparison' });
  }
});

router.get('/:userId/preferences', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = userPreferences.get(userId) || {
      favoriteTeams: [],
      notifications: {
        news: true,
        gameAlerts: true,
        playerUpdates: true
      },
      theme: 'light'
    };
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

router.patch('/:userId/preferences', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentPreferences = userPreferences.get(userId) || {
      favoriteTeams: [],
      notifications: {
        news: true,
        gameAlerts: true,
        playerUpdates: true
      },
      theme: 'light'
    };

    const updatedPreferences = {
      ...currentPreferences,
      ...req.body
    };

    userPreferences.set(userId, updatedPreferences);
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

router.delete('/:userId/history/:historyId', userLimiter, async (req, res) => {
  try {
    const { userId, historyId } = req.params;
    const history = userHistory.get(userId) || [];
    const updatedHistory = history.filter(item => item.id !== historyId);
    userHistory.set(userId, updatedHistory);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting history item:', error);
    res.status(500).json({ error: 'Failed to delete history item' });
  }
});

router.get('/:userId/notifications', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = userNotifications.get(userId) || [];
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:userId/notifications/:notificationId', userLimiter, async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    const notifications = userNotifications.get(userId) || [];
    const updatedNotifications = notifications.map((notif: Notification) =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    userNotifications.set(userId, updatedNotifications);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.get('/:userId/achievements', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const userProgress = userAchievements.get(userId) || {};
    
    // Combine achievement definitions with user progress
    const achievements = ACHIEVEMENTS.map(achievement => {
      const progress = userProgress[achievement.id] || {
        current: 0,
        total: achievement.requirement
      };
      
      return {
        ...achievement,
        progress,
        unlockedAt: progress.current >= achievement.requirement ? 
          userProgress[achievement.id]?.unlockedAt : undefined
      };
    });
    
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Add bookmark routes
router.get('/:userId/bookmarks', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const bookmarks = userBookmarks.get(userId) || [];
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

router.post('/:userId/bookmarks', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newsId } = req.body;

    if (!userBookmarks.has(userId)) {
      userBookmarks.set(userId, []);
    }

    const bookmarks = userBookmarks.get(userId)!;
    if (!bookmarks.includes(newsId)) {
      bookmarks.push(newsId);
      await checkAchievements(userId, 'bookmark');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

router.delete('/:userId/bookmarks/:newsId', userLimiter, async (req, res) => {
  try {
    const { userId, newsId } = req.params;
    const bookmarks = userBookmarks.get(userId) || [];
    const updatedBookmarks = bookmarks.filter(id => id !== newsId);
    userBookmarks.set(userId, updatedBookmarks);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// Add streak routes
router.get('/:userId/streak', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const streak = await streakService.getStreak(userId);
    res.json(streak || { currentStreak: 0, lastVisit: '', longestStreak: 0 });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

router.post('/:userId/visit', userLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const streak = await streakService.trackVisit(userId);
    await checkAchievements(userId, 'streak', streak.currentStreak);
    res.json(streak);
  } catch (error) {
    console.error('Error tracking visit:', error);
    res.status(500).json({ error: 'Failed to track visit' });
  }
});

// Helper function to check and update achievements
const checkAchievements = async (userId: string, action: string, value: number = 1) => {
  const userProgress = userAchievements.get(userId) || {};
  const notifications = userNotifications.get(userId) || [];
  const userData = await getUserData(userId);
  
  let updated = false;
  
  switch (action) {
    case 'comparison':
      if (!userProgress['compare-10']) {
        userProgress['compare-10'] = { current: 0, total: 10 };
      }
      userProgress['compare-10'].current += value;
      
      if (userProgress['compare-10'].current >= 10 && !userProgress['compare-10'].unlockedAt) {
        userProgress['compare-10'].unlockedAt = new Date().toISOString();
        notifications.unshift({
          id: Date.now().toString(),
          userId,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: 'You\'ve become a Comparison Expert!',
          read: false,
          createdAt: new Date().toISOString()
        });
        updated = true;
      }
      break;
      
    case 'bookmark':
      if (!userProgress['bookmark-20']) {
        userProgress['bookmark-20'] = { current: 0, total: 20 };
      }
      userProgress['bookmark-20'].current += value;
      
      if (userProgress['bookmark-20'].current >= 20 && !userProgress['bookmark-20'].unlockedAt) {
        userProgress['bookmark-20'].unlockedAt = new Date().toISOString();
        notifications.unshift({
          id: Date.now().toString(),
          userId,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: 'You\'ve become a News Collector!',
          read: false,
          createdAt: new Date().toISOString()
        });
        updated = true;
        
        if (userData) {
          emailQueueService.addToQueue('achievement', {
            email: userData.email,
            username: userData.displayName || 'NBA Fan',
            achievement: {
              title: 'News Collector',
              description: 'You\'ve bookmarked 20 news articles!'
            }
          });
        }
      }
      break;
      
    case 'streak':
      // Check 7-day streak
      if (!userProgress['daily-streak-7']?.unlockedAt && value >= 7) {
        userProgress['daily-streak-7'] = {
          current: value,
          total: 7,
          unlockedAt: new Date().toISOString()
        };
        notifications.unshift({
          id: Date.now().toString(),
          userId,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: 'You\'ve become a Weekly Warrior!',
          read: false,
          createdAt: new Date().toISOString()
        });
        updated = true;
        
        if (userData) {
          emailQueueService.addToQueue('achievement', {
            email: userData.email,
            username: userData.displayName || 'NBA Fan',
            achievement: {
              title: 'Weekly Warrior',
              description: 'You\'ve visited the site for 7 consecutive days!'
            }
          });
        }
      }
      
      // Check 30-day streak
      if (!userProgress['daily-streak-30']?.unlockedAt && value >= 30) {
        userProgress['daily-streak-30'] = {
          current: value,
          total: 30,
          unlockedAt: new Date().toISOString()
        };
        notifications.unshift({
          id: Date.now().toString(),
          userId,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: 'You\'ve become a Monthly Maven!',
          read: false,
          createdAt: new Date().toISOString()
        });
        updated = true;
        
        if (userData) {
          emailQueueService.addToQueue('achievement', {
            email: userData.email,
            username: userData.displayName || 'NBA Fan',
            achievement: {
              title: 'Monthly Maven',
              description: 'You\'ve visited the site for 30 consecutive days!'
            }
          });
        }
      }
      
      // Check 100-day streak
      if (!userProgress['longest-streak-100']?.unlockedAt && value >= 100) {
        userProgress['longest-streak-100'] = {
          current: value,
          total: 100,
          unlockedAt: new Date().toISOString()
        };
        notifications.unshift({
          id: Date.now().toString(),
          userId,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: 'You\'ve become a Streak Legend!',
          read: false,
          createdAt: new Date().toISOString()
        });
        updated = true;
        
        if (userData) {
          emailQueueService.addToQueue('achievement', {
            email: userData.email,
            username: userData.displayName || 'NBA Fan',
            achievement: {
              title: 'Streak Legend',
              description: 'You\'ve maintained a 100-day visit streak!'
            }
          });
        }
      }
      break;
  }
  
  if (updated) {
    userAchievements.set(userId, userProgress);
    userNotifications.set(userId, notifications);
  }
};

// Helper function to get user data
const getUserData = async (userId: string): Promise<User | null> => {
  // Mock user data - replace with actual database query
  return {
    uid: userId,
    email: 'user@example.com',
    displayName: 'NBA Fan'
  };
};

export default router; 