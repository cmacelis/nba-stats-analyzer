import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Chip,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import { VolumeUp, VolumeOff, Brightness4, Brightness7, BoltOutlined, PersonOutline } from '@mui/icons-material';
import { useSound } from '../contexts/SoundContext';
import { fadeIn } from '../utils/animations';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { OfflineIndicator } from './common/OfflineIndicator';
import SignInModal from './SignInModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { playSound, isSoundEnabled, toggleSound } = useSound();
  const { isDarkMode, toggleTheme } = useThemeMode();
  const { user, loading: authLoading, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);

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
            NBA Edge Detector
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
            <Button
              color="inherit"
              component={RouterLink}
              to="/predict"
              onMouseEnter={handleButtonHover}
              onClick={handleButtonClick}
              sx={{
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            >
              Matchup Edge
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/edge"
              onMouseEnter={handleButtonHover}
              onClick={handleButtonClick}
              sx={{
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            >
              Edge Feed
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/pricing"
              onMouseEnter={handleButtonHover}
              onClick={handleButtonClick}
              sx={{
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            >
              Pricing
            </Button>
            {!authLoading && !user && (
              <Button
                variant="outlined"
                color="inherit"
                component={RouterLink}
                to="/pricing"
                onMouseEnter={handleButtonHover}
                onClick={handleButtonClick}
                startIcon={<BoltOutlined />}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: '#fff',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }
                }}
              >
                Join VIP Pro
              </Button>
            )}
            {user?.vipActive && (
              <Chip label="VIP" color="success" size="small" sx={{ fontWeight: 700 }} />
            )}
            {!authLoading && (
              user ? (
                <Tooltip title={user.email}>
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<PersonOutline />}
                    onClick={signOut}
                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                  >
                    Sign Out
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<PersonOutline />}
                  onClick={() => setSignInOpen(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Sign In
                </Button>
              )
            )}
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
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </Box>
  );
};

export default Layout; 