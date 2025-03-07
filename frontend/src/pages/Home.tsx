import React from 'react';
import { Typography, Box, Button, Grid, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { CompareArrows, ShowChart } from '@mui/icons-material';
import { useSound } from '../contexts/SoundContext';
import { fadeIn, slideIn } from '../utils/animations';

const Home: React.FC = () => {
  const { playSound } = useSound();

  const handleButtonHover = () => {
    playSound('hover');
  };

  const handleButtonClick = () => {
    playSound('click');
  };

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{ animation: `${slideIn} 0.5s ease-out` }}
      >
        Welcome to NBA Stats Analyzer
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              animation: `${fadeIn} 0.5s ease-out 0.2s`,
              animationFillMode: 'backwards'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Player Comparison
            </Typography>
            <Typography variant="body1" paragraph>
              Compare statistics between any two NBA players.
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/compare"
              startIcon={<CompareArrows />}
              onMouseEnter={handleButtonHover}
              onClick={handleButtonClick}
              sx={{
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            >
              Compare Players
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              animation: `${fadeIn} 0.5s ease-out 0.4s`,
              animationFillMode: 'backwards'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Game Predictions
            </Typography>
            <Typography variant="body1" paragraph>
              Get AI-powered predictions for upcoming games.
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/predict"
              startIcon={<ShowChart />}
              onMouseEnter={handleButtonHover}
              onClick={handleButtonClick}
              sx={{
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            >
              View Predictions
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home; 