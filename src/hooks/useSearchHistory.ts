import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  type: 'player' | 'team' | 'comparison';
}

export const useSearchHistory = (maxItems: number = 10) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const addToHistory = async (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => {
    if (!user) return;

    const newItem: SearchHistoryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      searchHistory: arrayUnion(newItem)
    });

    setHistory(prev => [newItem, ...prev].slice(0, maxItems));
  };

  const clearHistory = async () => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { searchHistory: [] });
    setHistory([]);
  };

  return { history, addToHistory, clearHistory };
}; 