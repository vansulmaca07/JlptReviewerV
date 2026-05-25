import { createTheme } from '@mui/material/styles'

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            background: {
              default: '#f5f5f5',
              paper: '#ffffff',
            },
          }
        : {
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: '#ffffff',
              secondary: 'rgba(255,255,255,0.7)',
            },
          }),
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#1a3a5c',
          },
        },
      },
    },
  })