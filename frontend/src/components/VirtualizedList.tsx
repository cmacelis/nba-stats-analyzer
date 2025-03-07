import React from 'react';
import { Box } from '@mui/material';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemSize: number;
  renderItem: (item: T, style: React.CSSProperties) => React.ReactNode;
  onItemClick?: (item: T) => void;
}

interface AutoSizerProps {
  width: number;
  height: number;
}

export function VirtualizedList<T>({
  items,
  height,
  itemSize,
  renderItem,
  onItemClick
}: VirtualizedListProps<T>) {
  const Row = ({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    return (
      <div 
        style={style}
        onClick={() => onItemClick?.(item)}
      >
        {renderItem(item, style)}
      </div>
    );
  };

  return (
    <Box sx={{ height, width: '100%' }}>
      <AutoSizer>
        {({ width, height: autoHeight }: AutoSizerProps) => (
          <FixedSizeList
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={itemSize}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </Box>
  );
} 