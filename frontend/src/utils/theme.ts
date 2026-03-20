import { createTheme, ThemeOptions } from '@mui/material';

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  }
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#0F2B46',
      light: '#1A4068',
      dark: '#091D30',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00D68F',
      light: '#33E0A8',
      dark: '#00B377',
      contrastText: '#091D30',
    },
    background: {
      default: '#F8F9FB',
      paper: '#FFFFFF',
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#5BA4D9',
      light: '#90CAF9',
      dark: '#3A7CB8',
    },
    secondary: {
      main: '#00D68F',
      light: '#33E0A8',
      dark: '#00B377',
    },
    background: {
      default: '#0B1A2B',
      paper: '#122036',
    },
  },
});

export default lightTheme;
