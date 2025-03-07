interface UserStreak {
  currentStreak: number;
  lastVisit: string;
  longestStreak: number;
}

class StreakService {
  private streaks = new Map<string, UserStreak>();

  async trackVisit(userId: string): Promise<UserStreak> {
    const today = new Date().toISOString().split('T')[0];
    const streak = this.streaks.get(userId) || {
      currentStreak: 0,
      lastVisit: '',
      longestStreak: 0
    };

    if (streak.lastVisit === today) {
      return streak;
    }

    const lastVisitDate = streak.lastVisit ? new Date(streak.lastVisit) : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastVisitDate && lastVisitDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      streak.currentStreak += 1;
    } else if (!lastVisitDate || lastVisitDate.toISOString().split('T')[0] !== today) {
      streak.currentStreak = 1;
    }

    streak.lastVisit = today;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);

    this.streaks.set(userId, streak);
    return streak;
  }

  getStreak(userId: string): UserStreak | null {
    return this.streaks.get(userId) || null;
  }
}

export const streakService = new StreakService(); 