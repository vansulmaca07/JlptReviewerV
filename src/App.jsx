import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import {
  AppBar, Toolbar, Tabs, Tab, Box, Container, Button, Typography
} from '@mui/material'
import AddVocabForm from './components/AddVocabForm'
import VocabList from './components/VocabList'
import ReviewMode from './components/ReviewMode'
import GrammarMode from './components/GrammarMode'
import AdminLogin from './components/AdminLogin'
import LogoutIcon from '@mui/icons-material/Logout'
import LockOpenIcon from '@mui/icons-material/LockOpen'

function App() {
  const [activeTab, setActiveTab] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session)
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session)
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
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
        <AppBar position="static" elevation={0} sx={{ backgroundColor: '#1a3a5c', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          <Toolbar variant="dense" sx={{ minHeight: 30, px: 2 }}>
            <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>JLPT Reviewer</Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <Container maxWidth="md" sx={{ mt: 4 }}>
            <AdminLogin onLogin={() => { setIsAdmin(true); setShowLogin(false) }} onBack={() => setShowLogin(false)} />
          </Container>
        </Box>
        <Box component="footer" sx={{ backgroundColor: '#1a3a5c', color: 'rgba(255,255,255,0.75)', textAlign: 'center', py: 0.75, fontSize: '11px', letterSpacing: '0.3px', flexShrink: 0, boxShadow: '0 -2px 8px rgba(0,0,0,0.2)' }}>
          JLPT Reviewer — made by Van &nbsp;·&nbsp; 頑張ってください！！
        </Box>
      </Box>
    )
  }

  const VOCAB_TAB = 0
  const REVIEW_TAB = 1
  const GRAMMAR_TAB = 2
  const ADMIN_TAB = 3

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>

      {/* NAVBAR */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: '#1a3a5c', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
        <Toolbar variant="dense" sx={{ minHeight: 30, px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: 'white' } }}
            sx={{ minHeight: 30 }}
          >
            <Tab label="単語リスト" sx={{ color: 'white', textTransform: 'none', fontSize: '13px', minHeight: 30, py: 0 }} />
            <Tab label="復習モード" sx={{ color: 'white', textTransform: 'none', fontSize: '13px', minHeight: 30, py: 0 }} />
            <Tab label="文法" sx={{ color: 'white', textTransform: 'none', fontSize: '13px', minHeight: 30, py: 0 }} />
            {isAdmin && (
              <Tab label="単語追加" sx={{ color: 'white', textTransform: 'none', fontSize: '13px', minHeight: 30, py: 0 }} />
            )}
          </Tabs>

          <Box sx={{ flexGrow: 1 }} />

          {isAdmin ? (
            <Button size="small" startIcon={<LogoutIcon sx={{ fontSize: '16px !important' }} />} onClick={handleLogout}
              sx={{ color: 'white', textTransform: 'none', fontSize: '13px', opacity: 0.85, '&:hover': { opacity: 1 } }}>
              Logout
            </Button>
          ) : (
            <Button size="small" startIcon={<LockOpenIcon sx={{ fontSize: '16px !important' }} />} onClick={() => setShowLogin(true)}
              sx={{ color: 'white', textTransform: 'none', fontSize: '13px', opacity: 0.85, '&:hover': { opacity: 1 } }}>
              Admin
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* SCROLLABLE BODY */}
      <Box id="main-scroll" sx={{ flex: 1, overflowY: 'auto' }}>
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          {activeTab === VOCAB_TAB && (
            <VocabList key={refresh} isAdmin={isAdmin} userId={user?.id ?? null} />
          )}
          {activeTab === REVIEW_TAB && (
            <ReviewMode userId={user?.id ?? null} />
          )}
          {activeTab === GRAMMAR_TAB && (
            <GrammarMode />
          )}
          {isAdmin && activeTab === ADMIN_TAB && (
            <AddVocabForm onSuccess={() => { setRefresh(r => r + 1); setActiveTab(0) }} />
          )}
        </Container>
      </Box>

      {/* STICKY FOOTER */}
      <Box component="footer" sx={{ backgroundColor: '#1a3a5c', color: 'rgba(255,255,255,0.75)', textAlign: 'center', py: 0.75, fontSize: '11px', letterSpacing: '0.3px', flexShrink: 0, boxShadow: '0 -2px 8px rgba(0,0,0,0.2)' }}>
        JLPT Reviewer — made by Van &nbsp;·&nbsp; 頑張ってください！！
      </Box>

    </Box>
  )
}

export default App