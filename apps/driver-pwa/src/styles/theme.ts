import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B00',
      light: '#FF8533',
      dark: '#E66000',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#0F172A',
      light: '#334155',
      dark: '#020617',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#1E8E3E',
      light: '#E6F4EA',
    },
    warning: {
      main: '#F59E0B',
      light: '#FEF3C7',
    },
    error: {
      main: '#DC2626',
      light: '#FEE2E2',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
  },
  typography: {
    fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 14,
  },
});

export default theme;
