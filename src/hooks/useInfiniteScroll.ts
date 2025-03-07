import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  initialPage?: number;
}

export function useInfiniteScroll<T>(
  fetchItems: (page: number) => Promise<T[]>,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 100, initialPage = 1 } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const currentPage = useRef(initialPage);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, {
      rootMargin: `${threshold}px`
    });

    if (node) {
      observer.current.observe(node);
    }
  }, [loading, hasMore]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchItems(currentPage.current);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
        currentPage.current += 1;
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    loading,
    error,
    hasMore,
    lastElementRef,
    reset: () => {
      setItems([]);
      setHasMore(true);
      currentPage.current = initialPage;
      loadMore();
    }
  };
} 