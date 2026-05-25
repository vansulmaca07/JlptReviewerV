import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress,
  LinearProgress, Button, Grid, Select, MenuItem, FormControl, InputLabel,
  useTheme, useMediaQuery
} from '@mui/material'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SchoolIcon from '@mui/icons-material/School'
import {
  fetchLevelProgress, fetchWeakestWords, fetchWordsDueForReview,
  fetchStreak, fetchDailyActivity, fetchRecentSessions, fetchTotalWordsPerLevel, fetchProfile
} from '../utils/statsService'

const NAVY = '#1a3a5c'

export default function StatsMode({ userId }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState('N5')
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 })
  const [levelProgress, setLevelProgress] = useState([])
  const [totalWords, setTotalWords] = useState({})
  const [weakWords, setWeakWords] = useState([])
  const [dueWords, setDueWords] = useState([])
  const [activity, setActivity] = useState([])
  const [recentSessions, setRecentSessions] = useState([])

  useEffect(() => {
    if (userId) loadStats()
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchWeakestWords(userId, 10).then(data => {
        setWeakWords(selectedLevel === 'all' ? data : data.filter(w => w.jlpt_level === selectedLevel))
      })
    }
  }, [selectedLevel, userId])

  async function loadStats() {
    setLoading(true)
    const [streakData, progressData, totals, weak, due, activityData, sessions] = await Promise.all([
      fetchStreak(userId),
      fetchLevelProgress(userId),
      fetchTotalWordsPerLevel(),
      fetchWeakestWords(userId, 15),
      fetchWordsDueForReview(userId, 20),
      fetchDailyActivity(userId, 30),
      fetchRecentSessions(userId, 5),
    ])
    setStreak(streakData)
    setLevelProgress(progressData)
    setTotalWords(totals)
    setWeakWords(weak)
    setDueWords(due)
    setActivity(activityData)
    setRecentSessions(sessions)
    setLoading(false)
  }

  if (!userId) {
    return (
      <Box textAlign="center" mt={6}>
        <SchoolIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" mb={1}>Login to Track Progress</Typography>
        <Typography color="text.disabled" fontSize="13px">
          Sign in to see your learning statistics, streaks, and personalized recommendations.
        </Typography>
      </Box>
    )
  }

  if (loading) return <Box textAlign="center" mt={10}><CircularProgress sx={{ color: NAVY }} /></Box>

  // Calculate today's stats
  const today = new Date().toISOString().split('T')[0]
  const todayActivity = activity.find(a => a.activity_date === today)
  const todayWords = todayActivity?.words_reviewed || 0
  const todayCorrect = todayActivity?.words_correct || 0
  const todayAccuracy = todayWords > 0 ? Math.round((todayCorrect / todayWords) * 100) : 0

  // Level-specific progress
  const currentLevelData = levelProgress.find(l => l.jlpt_level === selectedLevel)
  const totalInLevel = totalWords[selectedLevel] || 0
  const mastered = currentLevelData?.mastered_count || 0
  const learning = currentLevelData?.learning_count || 0
  const struggling = currentLevelData?.struggling_count || 0
  const notStarted = totalInLevel - mastered - learning - struggling
  const progressPct = totalInLevel > 0 ? Math.round(((mastered + learning) / totalInLevel) * 100) : 0

  // Activity heatmap (last 7 days)
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayActivity = activity.find(a => a.activity_date === dateStr)
    last7.push({ date: dateStr, day: d.toLocaleDateString('en', { weekday: 'short' }), count: dayActivity?.words_reviewed || 0 })
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      {/* HEADER: Streak + Level Selector */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <WhatshotIcon sx={{ color: streak.current_streak > 0 ? '#ff6b35' : 'text.disabled', fontSize: 28 }} />
          <Box>
            <Typography fontWeight="bold" fontSize="18px" lineHeight={1}>
              {streak.current_streak}
            </Typography>
            <Typography fontSize="10px" color="text.secondary">day streak</Typography>
          </Box>
        </Box>
        <FormControl size="small">
          <InputLabel sx={{ fontSize: '12px' }}>Level</InputLabel>
          <Select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
            label="Level" sx={{ height: 34, fontSize: '13px', minWidth: 80 }}>
            <MenuItem value="N5">N5</MenuItem>
            <MenuItem value="N4">N4</MenuItem>
            <MenuItem value="N3">N3</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* TODAY'S SUMMARY */}
      <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Typography fontSize="11px" fontWeight="bold" color="text.secondary" mb={1}>TODAY</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4} textAlign="center">
              <Typography fontWeight="bold" fontSize="20px">{todayWords}</Typography>
              <Typography fontSize="10px" color="text.secondary">words reviewed</Typography>
            </Grid>
            <Grid item xs={4} textAlign="center">
              <Typography fontWeight="bold" fontSize="20px" color={todayAccuracy >= 80 ? 'success.main' : todayAccuracy >= 50 ? 'warning.main' : 'text.primary'}>
                {todayAccuracy}%
              </Typography>
              <Typography fontSize="10px" color="text.secondary">accuracy</Typography>
            </Grid>
            <Grid item xs={4} textAlign="center">
              <Typography fontWeight="bold" fontSize="20px">{recentSessions.filter(s => s.completed_at?.startsWith(today)).length}</Typography>
              <Typography fontSize="10px" color="text.secondary">sessions</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* WEEKLY ACTIVITY */}
      <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Typography fontSize="11px" fontWeight="bold" color="text.secondary" mb={1}>LAST 7 DAYS</Typography>
          <Box display="flex" justifyContent="space-between" alignItems="flex-end" height={50}>
            {last7.map((d, i) => {
              const maxCount = Math.max(...last7.map(x => x.count), 1)
              const height = d.count > 0 ? Math.max(8, (d.count / maxCount) * 40) : 4
              return (
                <Box key={i} textAlign="center" flex={1}>
                  <Box sx={{
                    width: 20, height, mx: 'auto', borderRadius: 1,
                    backgroundColor: d.count > 0 ? NAVY : (isDark ? '#333' : '#e0e0e0'),
                    opacity: d.count > 0 ? (0.4 + (d.count / maxCount) * 0.6) : 0.3,
                  }} />
                  <Typography fontSize="9px" color="text.disabled" mt={0.5}>{d.day}</Typography>
                </Box>
              )
            })}
          </Box>
        </CardContent>
      </Card>

      {/* LEVEL PROGRESS */}
      <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography fontSize="11px" fontWeight="bold" color="text.secondary">
              {selectedLevel} PROGRESS
            </Typography>
            <Typography fontSize="12px" fontWeight="bold" color={NAVY}>
              {progressPct}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progressPct}
            sx={{ height: 8, borderRadius: 4, mb: 1.5, backgroundColor: isDark ? '#333' : '#e8e8e8',
              '& .MuiLinearProgress-bar': { backgroundColor: NAVY, borderRadius: 4 } }} />
          <Grid container spacing={1}>
            <Grid item xs={3}>
              <Box textAlign="center" sx={{ backgroundColor: isDark ? '#1e3a1e' : '#e8f5e9', borderRadius: 1, py: 0.75 }}>
                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                <Typography fontWeight="bold" fontSize="14px">{mastered}</Typography>
                <Typography fontSize="9px" color="text.secondary">Mastered</Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center" sx={{ backgroundColor: isDark ? '#2a2a1e' : '#fff8e1', borderRadius: 1, py: 0.75 }}>
                <TrendingUpIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                <Typography fontWeight="bold" fontSize="14px">{learning}</Typography>
                <Typography fontSize="9px" color="text.secondary">Learning</Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center" sx={{ backgroundColor: isDark ? '#2a1e1e' : '#fce4ec', borderRadius: 1, py: 0.75 }}>
                <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main' }} />
                <Typography fontWeight="bold" fontSize="14px">{struggling}</Typography>
                <Typography fontSize="9px" color="text.secondary">Struggling</Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center" sx={{ backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5', borderRadius: 1, py: 0.75 }}>
                <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography fontWeight="bold" fontSize="14px">{notStarted}</Typography>
                <Typography fontSize="9px" color="text.secondary">Not started</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* WORDS DUE FOR REVIEW */}
      {dueWords.length > 0 && (
        <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography fontSize="11px" fontWeight="bold" color="text.secondary">
                DUE FOR REVIEW
              </Typography>
              <Chip label={`${dueWords.length} words`} size="small" sx={{ height: 18, fontSize: '10px', backgroundColor: '#ff6b35', color: 'white' }} />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {dueWords.slice(0, 12).map(w => (
                <Chip key={w.vocab_id} label={w.word} size="small" variant="outlined"
                  sx={{ fontSize: '12px', height: 24 }} />
              ))}
              {dueWords.length > 12 && (
                <Chip label={`+${dueWords.length - 12} more`} size="small" sx={{ fontSize: '10px', height: 24 }} />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* WEAKEST WORDS */}
      {weakWords.length > 0 && (
        <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography fontSize="11px" fontWeight="bold" color="text.secondary" mb={1}>
              NEEDS WORK ({selectedLevel})
            </Typography>
            {weakWords.filter(w => selectedLevel === 'all' || w.jlpt_level === selectedLevel).slice(0, 8).map(w => (
              <Box key={w.vocab_id} display="flex" justifyContent="space-between" alignItems="center"
                sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography fontSize="13px" fontWeight="bold">{w.word}</Typography>
                  <Typography fontSize="10px" color="text.secondary">{w.reading} — {w.meaning}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography fontSize="11px" color="error.main" fontWeight="bold">{w.error_rate}% errors</Typography>
                  <Typography fontSize="9px" color="text.disabled">
                    {w.correct_count}✓ {w.wrong_count}✗
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* RECENT SESSIONS */}
      {recentSessions.length > 0 && (
        <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography fontSize="11px" fontWeight="bold" color="text.secondary" mb={1}>
              RECENT SESSIONS
            </Typography>
            {recentSessions.slice(0, 5).map(s => {
              const pct = s.total_cards > 0 ? Math.round((s.correct_count / s.total_cards) * 100) : 0
              const date = new Date(s.completed_at)
              return (
                <Box key={s.id} display="flex" justifyContent="space-between" alignItems="center"
                  sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography fontSize="12px" fontWeight="bold" textTransform="capitalize">{s.mode.replace('_', ' ')}</Typography>
                    <Typography fontSize="9px" color="text.disabled">
                      {date.toLocaleDateString()} • {s.total_cards} cards
                    </Typography>
                  </Box>
                  <Typography fontSize="13px" fontWeight="bold"
                    color={pct >= 80 ? 'success.main' : pct >= 50 ? 'warning.main' : 'error.main'}>
                    {pct}%
                  </Typography>
                </Box>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* EMPTY STATE */}
      {levelProgress.length === 0 && dueWords.length === 0 && (
        <Card sx={{ mb: 1.5, textAlign: 'center' }} elevation={0} variant="outlined">
          <CardContent sx={{ py: 4 }}>
            <SchoolIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography fontWeight="bold" mb={0.5}>No data yet!</Typography>
            <Typography fontSize="12px" color="text.secondary">
              Start reviewing words in 復習 mode to see your progress here.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
