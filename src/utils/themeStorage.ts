import { doc, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ThemeData } from '../types/common';

interface ThemeBackup {
  id: string;
  name: string;
  timestamp: string;
  theme: ThemeData;
}

interface ThemeCollection {
  id: string;
  name: string;
  themes: ThemeBackup[];
  createdAt: string;
  updatedAt: string;
}

export class ThemeStorageService {
  async saveTheme(userId: string, theme: ThemeData): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const backup: ThemeBackup = {
      id: crypto.randomUUID(),
      name: `Theme Backup ${new Date().toLocaleString()}`,
      timestamp: new Date().toISOString(),
      theme
    };

    await updateDoc(userRef, {
      themeBackups: arrayUnion(backup)
    });
  }

  async getThemes(userId: string): Promise<ThemeBackup[]> {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    return snapshot.data().themeBackups || [];
  }

  async deleteTheme(userId: string, themeId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
    
    if (snapshot.exists()) {
      const themes = snapshot.data().themeBackups || [];
      const themeToDelete = themes.find((t: ThemeBackup) => t.id === themeId);
      
      if (themeToDelete) {
        await updateDoc(userRef, {
          themeBackups: arrayRemove(themeToDelete)
        });
      }
    }
  }
}

export const themeStorage = new ThemeStorageService(); 