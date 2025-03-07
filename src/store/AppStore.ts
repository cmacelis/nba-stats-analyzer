import { create } from 'zustand';
import { persist, PersistOptions, StateCreator } from 'zustand/middleware';

interface AppState {
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    autoRefresh: boolean;
  };
  user: {
    favorites: string[];
    recentSearches: string[];
  };
  setPreference: <K extends keyof AppState['preferences']>(key: K, value: AppState['preferences'][K]) => void;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

type AppPersist = (
  config: StateCreator<AppState>,
  options: PersistOptions<AppState>
) => StateCreator<AppState>;

export const useAppStore = create<AppState>()(
  (persist as AppPersist)(
    (set) => ({
      preferences: {
        theme: 'light',
        notifications: true,
        autoRefresh: true,
      },
      user: {
        favorites: [],
        recentSearches: [],
      },
      setPreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),
      addFavorite: (id) =>
        set((state) => ({
          user: {
            ...state.user,
            favorites: [...state.user.favorites, id],
          },
        })),
      removeFavorite: (id) =>
        set((state) => ({
          user: {
            ...state.user,
            favorites: state.user.favorites.filter((fav) => fav !== id),
          },
        })),
      addRecentSearch: (query) =>
        set((state) => ({
          user: {
            ...state.user,
            recentSearches: [
              query,
              ...state.user.recentSearches.filter((q) => q !== query),
            ].slice(0, 10),
          },
        })),
      clearRecentSearches: () =>
        set((state) => ({
          user: { ...state.user, recentSearches: [] },
        })),
    }),
    {
      name: 'app-storage',
    }
  )
); 