import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Button, 
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import { VolumeUp, VolumeOff, Brightness4, Brightness7 } from '@mui/icons-material';
import { useSound } from '../contexts/SoundContext';
import { fadeIn } from '../utils/animations';
import { useThemeMode } from '../contexts/ThemeContext';
import { OfflineIndicator } from './common/OfflineIndicator';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { playSound, isSoundEnabled, toggleSound } = useSound();
  const { isDarkMode, toggleTheme } = useThemeMode();

  const handleButtonHover = () => {
    playSound('hover');
  };

  const handleButtonClick = () => {
    playSound('click');
  };

  const handleSoundToggle = () => {
    toggleSound();
    playSound('switch');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: 'inherit', 
              flexGrow: 1,
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 0.8
              }
            }}
          >
            NBA Stats Analyzer
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/"
              onMouseEnter={handleButtonHover}
              onClick={handleButtonClick}
              sx={{
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            >
              Home
            </Button>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/compare"
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
            <Tooltip title={`Sound ${isSoundEnabled ? 'On' : 'Off'}`}>
              <IconButton 
                color="inherit"
                onClick={handleSoundToggle}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {isSoundEnabled ? <VolumeUp /> : <VolumeOff />}
              </IconButton>
            </Tooltip>
            <Tooltip title={`${isDarkMode ? 'Light' : 'Dark'} Mode`}>
              <IconButton 
                color="inherit"
                onClick={toggleTheme}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {isDarkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container 
        sx={{ 
          mt: 4,
          animation: `${fadeIn} 0.5s ease-out 0.2s`,
          animationFillMode: 'backwards'
        }}
      >
        {children}
      </Container>

      <OfflineIndicator 
        position={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        persistent={false}
      />
    </Box>
  );
};

export default Layout; 