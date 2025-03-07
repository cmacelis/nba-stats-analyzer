import React, { useState, useEffect } from 'react';
import { 
  Autocomplete, 
  TextField, 
  CircularProgress,
  Box,
  Typography,
  Pagination,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useSearchPlayers } from '../hooks/useNbaData';
import { useDebounce } from '../hooks/useDebounce';
import { Player } from '../types/player';
import { mapApiPlayerToPlayer } from '../utils/dataMappers';

interface PlayerSearchProps {
  value: Player | null;
  onChange: (player: Player | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const PlayerSearch: React.FC<PlayerSearchProps> = ({
  value,
  onChange,
  label = 'Player',
  placeholder = 'Search for a player...',
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearchTerm = useDebounce(inputValue, 500);
  
  const { 
    data: searchResults, 
    isLoading, 
    error 
  } = useSearchPlayers(debouncedSearchTerm, page, 25);
  
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  const mappedPlayers = searchResults?.data.map(mapApiPlayerToPlayer) || [];

  return (
    <Box>
      <Autocomplete
        value={value}
        onChange={(_event, newValue) => {
          onChange(newValue);
        }}
        inputValue={inputValue}
        onInputChange={(_event, newValue) => {
          setInputValue(newValue);
          setPage(1); // Reset to first page on new search
        }}
        options={mappedPlayers}
        getOptionLabel={(option) => option.name}
        loading={isLoading}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <ListItem {...props}>
            <ListItemText 
              primary={option.name} 
              secondary={`${option.team} • ${option.position}`} 
            />
          </ListItem>
        )}
        noOptionsText={
          debouncedSearchTerm.length < 2 
            ? "Type at least 2 characters to search" 
            : "No players found"
        }
      />
      
      {searchResults && searchResults.meta.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={searchResults.meta.total_pages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="small"
          />
        </Box>
      )}
      
      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          Error loading players. Please try again.
        </Typography>
      )}
    </Box>
  );
};

export default PlayerSearch; 