import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import {
  AppBar, Toolbar, Box, Container, Button, Typography, IconButton, Tooltip,
  BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme
} from '@mui/material'
import AddVocabForm from './components/AddVocabForm'
import VocabList from './components/VocabList'
import ReviewMode from './components/ReviewMode'
import GrammarMode from './components/GrammarMode'
import StatsMode from './components/StatsMode'
import AuthPage from './components/AuthPage'
import AdminLogin from './components/AdminLogin'
import LogoutIcon from '@mui/icons-material/Logout'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import SchoolIcon from '@mui/icons-material/School'
import TranslateIcon from '@mui/icons-material/Translate'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import BarChartIcon from '@mui/icons-material/BarChart'

function App({ darkMode, setDarkMode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isDark = theme.palette.mode === 'dark'

  const [activeTab, setActiveTab] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  const ADMIN_EMAIL = 'vjsulmaca@gmail.com'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(session?.user?.email === ADMIN_EMAIL)
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(session?.user?.email === ADMIN_EMAIL)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setIsAdmin(false)
    setUser(null)
    setActiveTab(0)
  }

  if (authLoading) return null

  if (showLogin && !isAdmin) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppBar position="static" elevation={0} sx={{ backgroundColor: '#1a3a5c', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <Toolbar sx={{ minHeight: { xs: 48, sm: 56 }, px: 2 }}>
            <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '15px', sm: '16px' } }}>
              JLPT Reviewer <Typography component="span" sx={{ fontWeight: 400, fontSize: '11px', opacity: 0.7 }}>(by Van)</Typography>
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <Container maxWidth="md" sx={{ mt: 4 }}>
            <AdminLogin onLogin={() => { setIsAdmin(true); setShowLogin(false) }} onBack={() => setShowLogin(false)} />
          </Container>
        </Box>
      </Box>
    )
  }

  const VOCAB_TAB = 0
  const REVIEW_TAB = 1
  const GRAMMAR_TAB = 2
  const STATS_TAB = 3
  const ADMIN_TAB = 4

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* TOP BAR — clean, just app name + utility icons */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: '#1a3a5c', flexShrink: 0 }}>
        <Toolbar disableGutters sx={{ minHeight: '40px !important', height: 40, px: 2, justifyContent: 'space-between' }}>
          <Typography
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.3px',
            }}
          >
            JLPT Reviewer <Typography component="span" sx={{ fontWeight: 400, fontSize: '10px', opacity: 0.7 }}>(by Van)</Typography>
          </Typography>

          <Box display="flex" alignItems="center" gap={0.25}>
            <IconButton onClick={() => setDarkMode(!darkMode)} size="small" sx={{ color: 'white', opacity: 0.8, p: 0.5 }}>
              {darkMode ? <LightModeIcon sx={{ fontSize: 17 }} /> : <DarkModeIcon sx={{ fontSize: 17 }} />}
            </IconButton>

            {user ? (
              <IconButton size="small" onClick={handleLogout} sx={{ color: 'white', opacity: 0.8, p: 0.5 }}>
                <LogoutIcon sx={{ fontSize: 17 }} />
              </IconButton>
            ) : (
              <IconButton size="small" onClick={() => setShowLogin(true)} sx={{ color: 'white', opacity: 0.4, p: 0.5 }}>
                <LockOpenIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* SCROLLABLE BODY */}
      <Box id="main-scroll" sx={{ flex: 1, overflowY: 'auto', pb: '56px' }}>
        <Container maxWidth="md" sx={{ pt: { xs: 1.5, sm: 2.5 }, pb: 2, px: { xs: 1.5, sm: 3 } }}>
          {activeTab === VOCAB_TAB && (
            <VocabList key={refresh} isAdmin={isAdmin} userId={user?.id ?? null} />
          )}
          {activeTab === REVIEW_TAB && (
            <ReviewMode userId={user?.id ?? null} />
          )}
          {activeTab === GRAMMAR_TAB && (
            <GrammarMode />
          )}
          {activeTab === STATS_TAB && (
            user ? <StatsMode userId={user.id} /> : <AuthPage onAuth={() => {}} />
          )}
          {isAdmin && activeTab === ADMIN_TAB && (
            <AddVocabForm onSuccess={() => { setRefresh(r => r + 1); setActiveTab(0) }} />
          )}
        </Container>
      </Box>

      {/* BOTTOM NAVIGATION */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        }}
        elevation={0}
      >
        <BottomNavigation
          value={activeTab}
          onChange={(_, newVal) => {
            setActiveTab(newVal)
            document.getElementById('main-scroll')?.scrollTo(0, 0)
          }}
          sx={{
            height: 52,
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            '& .MuiBottomNavigationAction-root': {
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              minWidth: 'auto',
              padding: '4px 0 2px',
              '&.Mui-selected': {
                color: '#1a3a5c',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '10px',
              marginTop: '2px',
              '&.Mui-selected': {
                fontSize: '10px',
                fontWeight: 600,
              },
            },
            '& .MuiSvgIcon-root': {
              fontSize: '20px',
            },
          }}
          showLabels
        >
          <BottomNavigationAction label="単語" icon={<TranslateIcon />} />
          <BottomNavigationAction label="復習" icon={<SchoolIcon />} />
          <BottomNavigationAction label="文法" icon={<MenuBookIcon />} />
          <BottomNavigationAction label="統計" icon={<BarChartIcon />} />
          {isAdmin && (
            <BottomNavigationAction label="追加" icon={<AddCircleOutlineIcon />} />
          )}
        </BottomNavigation>
      </Paper>

    </Box>
  )
}

export default App