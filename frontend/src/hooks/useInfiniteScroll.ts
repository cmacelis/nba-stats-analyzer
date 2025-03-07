import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useInfiniteScroll<T>({
  threshold = 0.5,
  rootMargin = '100px',
  enabled = true
}: UseInfiniteScrollOptions = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver>();
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async (loadMoreFn: () => Promise<T[]>) => {
    if (!isLoading && hasMore) {
      setIsLoading(true);
      try {
        const newItems = await loadMoreFn();
        setItems(prev => [...prev, ...newItems]);
        setHasMore(newItems.length > 0);
      } catch (error) {
        console.error('Error loading more items:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoading) {
          loadingRef.current?.click();
        }
      },
      { threshold, rootMargin }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [enabled, isLoading, threshold, rootMargin]);

  return {
    items,
    setItems,
    isLoading,
    hasMore,
    loadingRef,
    loadMore
  };
} 