import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { VirtualizedList } from '../VirtualizedList';

interface ProgressiveListProps<T> {
  loadMore: () => Promise<T[]>;
  renderItem: (item: T, style: React.CSSProperties) => React.ReactNode;
  itemSize: number;
  height?: number;
  emptyMessage?: string;
  loadingMessage?: string;
}

export function ProgressiveList<T>({
  loadMore,
  renderItem,
  itemSize,
  height = 400,
  emptyMessage = 'No items to display',
  loadingMessage = 'Loading more items...'
}: ProgressiveListProps<T>) {
  const {
    items,
    isLoading,
    hasMore,
    loadingRef,
    loadMore: handleLoadMore
  } = useInfiniteScroll<T>();

  React.useEffect(() => {
    handleLoadMore(loadMore);
  }, []);

  if (items.length === 0 && !isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative' }}>
      <VirtualizedList
        items={items}
        height={height - (hasMore ? 50 : 0)}
        itemSize={itemSize}
        renderItem={renderItem}
      />
      
      {hasMore && (
        <Box
          ref={loadingRef}
          onClick={() => handleLoadMore(loadMore)}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 2,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {loadingMessage}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="primary">
              Load more
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
} 