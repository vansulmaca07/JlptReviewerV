import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from './theme'
import { useState } from 'react'

function Root() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <ThemeProvider theme={getTheme(darkMode ? 'dark' : 'light')}>
      <CssBaseline />
      <App darkMode={darkMode} setDarkMode={setDarkMode} />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)