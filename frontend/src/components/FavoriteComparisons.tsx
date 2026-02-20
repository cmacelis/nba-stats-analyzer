import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useFavorites } from '../hooks/useFavorites';
import { useSound } from '../contexts/SoundContext';
import { TransitionComponent } from './common/TransitionComponent';

interface FavoriteComparisonsProps {
  onSelect: (player1Id: number, player2Id: number) => void;
}

const FavoriteComparisons: React.FC<FavoriteComparisonsProps> = ({ onSelect }) => {
  const { favorites, removeFavorite } = useFavorites();
  const { playSound } = useSound();

  if (favorites.length === 0) {
    return null;
  }

  return (
    <TransitionComponent>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Comparisons
        </Typography>
        <List>
          {favorites.map(({ id, player1, player2, timestamp }) => (
            <ListItem
              key={id}
              button
              onClick={() => {
                playSound('click');
                onSelect(player1.id, player2.id);
              }}
              sx={{
                '&:hover': {
                  backgroundColor: 'action.hover',
                }
              }}
            >
              <ListItemText
                primary={`${player1.name} vs ${player2.name}`}
                secondary={new Date(timestamp).toLocaleDateString()}
              />
              <ListItemSecondaryAction>
                <Tooltip title="Remove from favorites">
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound('switch');
                      removeFavorite(id);
                    }}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
    </TransitionComponent>
  );
};

export default FavoriteComparisons; 