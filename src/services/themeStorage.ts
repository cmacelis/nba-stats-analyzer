import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ThemeSchedule {
  id: string;
  name: string;
  theme: string;
  startTime: string;
  endTime: string;
  days: string[];
  enabled: boolean;
}

export interface ThemePreference {
  theme: string;
  schedules: ThemeSchedule[];
  customColors: {
    primary: string;
    secondary: string;
  };
}

class ThemeStorageService {
  private async getUserThemeDoc(userId: string) {
    return doc(db, 'users', userId, 'preferences', 'theme');
  }

  async saveThemePreference(userId: string, preference: ThemePreference): Promise<void> {
    const themeDoc = await this.getUserThemeDoc(userId);
    await setDoc(themeDoc, preference, { merge: true });
  }

  async getThemePreference(userId: string): Promise<ThemePreference | null> {
    try {
      const themeDoc = await this.getUserThemeDoc(userId);
      const snapshot = await getDoc(themeDoc);
      return snapshot.exists() ? snapshot.data() as ThemePreference : null;
    } catch (error) {
      console.error('Error fetching theme preference:', error);
      return null;
    }
  }

  async updateSchedules(userId: string, schedules: ThemeSchedule[]): Promise<void> {
    const themeDoc = await this.getUserThemeDoc(userId);
    await updateDoc(themeDoc, { schedules });
  }

  async toggleSchedule(userId: string, scheduleId: string, enabled: boolean): Promise<void> {
    const themeDoc = await this.getUserThemeDoc(userId);
    const snapshot = await getDoc(themeDoc);
    
    if (snapshot.exists()) {
      const data = snapshot.data() as ThemePreference;
      const updatedSchedules = data.schedules.map(schedule => 
        schedule.id === scheduleId ? { ...schedule, enabled } : schedule
      );
      await this.updateSchedules(userId, updatedSchedules);
    }
  }
}

export const themeStorage = new ThemeStorageService(); 