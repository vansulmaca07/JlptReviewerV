import { useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  Box, Card, CardContent, Typography, TextField, Button, CircularProgress, Alert
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Invalid email or password.')
    else onLogin()
    setLoading(false)
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <LockIcon sx={{ fontSize: 40, color: '#1a3a5c' }} />
            <Typography variant="h6" fontWeight="bold" mt={1}>Admin Login</Typography>
            <Typography variant="caption" color="text.secondary">JLPT Reviewer</Typography>
          </Box>

          {/* NOTICE */}
          <Alert severity="info" sx={{ mb: 2 }}>
            As of now, only Van can edit this reviewer. 😄
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleLogin}>
            <TextField fullWidth label="Email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              size="small" sx={{ mb: 2 }} required />
            <TextField fullWidth label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              size="small" sx={{ mb: 3 }} required />
            <Button type="submit" fullWidth variant="contained" size="large"
              disabled={loading} sx={{ backgroundColor: '#1a3a5c', py: 1.5, mb: 1.5 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : '🔐 Login'}
            </Button>
            <Button fullWidth variant="text" startIcon={<ArrowBackIcon />}
              onClick={onBack} disabled={loading}
              sx={{ color: 'text.secondary', textTransform: 'none' }}>
              Back to Reviewer
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AdminLogin