import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
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
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  VolumeUp,
  VolumeOff,
  Brightness4,
  Brightness7,
  BoltOutlined,
  PersonOutline,
  Logout,
  CheckCircle,
} from '@mui/icons-material';
import { useSound } from '../contexts/SoundContext';
import { fadeIn } from '../utils/animations';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { OfflineIndicator } from './common/OfflineIndicator';
import SignInModal from './SignInModal';

interface LayoutProps {
  children: React.ReactNode;
}

// Discord SVG icon (inline to avoid extra dependency)
const DiscordIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { playSound, isSoundEnabled, toggleSound } = useSound();
  const { isDarkMode, toggleTheme } = useThemeMode();
  const { user, loading: authLoading, signOut, refetch } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [discordToast, setDiscordToast] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle Discord OAuth redirect params
  useEffect(() => {
    const discord = searchParams.get('discord');
    if (!discord) return;

    if (discord === 'connected') {
      setDiscordToast('Discord connected! VIP Pro role assigned.');
      refetch();
    } else if (discord === 'connected_no_role') {
      setDiscordToast('Discord connected! Subscribe to VIP Pro to get your role.');
      refetch();
    } else if (discord === 'denied') {
      setDiscordToast('Discord connection cancelled.');
    } else if (discord === 'error') {
      setDiscordToast('Discord connection failed. Please try again.');
    }

    // Clear the query param
    searchParams.delete('discord');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, refetch]);

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
            EdgeDetector.ai
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
                <>
                  <Tooltip title={user.email}>
                    <Button
                      color="inherit"
                      size="small"
                      startIcon={<PersonOutline />}
                      onClick={(e) => setMenuAnchor(e.currentTarget)}
                      sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                    >
                      {user.email.split('@')[0]}
                    </Button>
                  </Tooltip>
                  <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { minWidth: 200, mt: 1 } } }}
                  >
                    {user.discordConnected ? (
                      <MenuItem disabled>
                        <ListItemIcon><CheckCircle fontSize="small" color="success" /></ListItemIcon>
                        <ListItemText
                          primary="Discord Connected"
                          secondary={user.discordUsername || undefined}
                        />
                      </MenuItem>
                    ) : (
                      <MenuItem
                        onClick={() => {
                          setMenuAnchor(null);
                          window.location.href = '/api/auth?_subpath=discord/start';
                        }}
                      >
                        <ListItemIcon><DiscordIcon /></ListItemIcon>
                        <ListItemText primary="Connect Discord" />
                      </MenuItem>
                    )}
                    <Divider />
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        signOut();
                      }}
                    >
                      <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Sign Out" />
                    </MenuItem>
                  </Menu>
                </>
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

      {/* Discord connection toast */}
      <Snackbar
        open={!!discordToast}
        autoHideDuration={5000}
        onClose={() => setDiscordToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setDiscordToast(null)}
          severity={discordToast?.includes('failed') || discordToast?.includes('cancelled') ? 'warning' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {discordToast}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout; 