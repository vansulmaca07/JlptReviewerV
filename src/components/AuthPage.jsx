import { useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  CircularProgress, Alert, Tabs, Tab, Divider
} from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'

function AuthPage({ onAuth }) {
  const [tab, setTab] = useState(0) // 0 = login, 1 = signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Invalid email or password.')
    else onAuth?.()
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError(''); setSuccess('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split('@')[0] } }
    })
    if (error) setError(error.message)
    else {
      setSuccess('Account created! Check your email to confirm, then login.')
      setTab(0)
    }
    setLoading(false)
  }

  return (
    <Box sx={{ maxWidth: 380, mx: 'auto', mt: 4 }}>
      <Card elevation={0} variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box textAlign="center" mb={2}>
            <SchoolIcon sx={{ fontSize: 36, color: '#1a3a5c' }} />
            <Typography fontWeight="bold" fontSize="16px" mt={0.5}>JLPT Reviewer</Typography>
            <Typography fontSize="11px" color="text.secondary">
              Login to track your progress & stats
            </Typography>
          </Box>

          <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); setSuccess('') }}
            variant="fullWidth" sx={{ mb: 2, '& .MuiTab-root': { fontSize: '12px', minHeight: 36 } }}>
            <Tab label="Login" />
            <Tab label="Sign Up" />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2, fontSize: '12px' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, fontSize: '12px' }}>{success}</Alert>}

          {tab === 0 ? (
            <Box component="form" onSubmit={handleLogin}>
              <TextField fullWidth label="Email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                size="small" sx={{ mb: 1.5 }} required />
              <TextField fullWidth label="Password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                size="small" sx={{ mb: 2 }} required />
              <Button type="submit" fullWidth variant="contained" disabled={loading}
                sx={{ backgroundColor: '#1a3a5c', py: 1, fontSize: '13px' }}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Login'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSignup}>
              <TextField fullWidth label="Display Name" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                size="small" sx={{ mb: 1.5 }} placeholder="Your name (optional)" />
              <TextField fullWidth label="Email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                size="small" sx={{ mb: 1.5 }} required />
              <TextField fullWidth label="Password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                size="small" sx={{ mb: 2 }} required
                helperText="At least 6 characters" />
              <Button type="submit" fullWidth variant="contained" disabled={loading}
                sx={{ backgroundColor: '#1a3a5c', py: 1, fontSize: '13px' }}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Account'}
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography fontSize="10px" color="text.disabled" textAlign="center">
            You can use the app without an account. Login is only needed for progress tracking.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AuthPage
