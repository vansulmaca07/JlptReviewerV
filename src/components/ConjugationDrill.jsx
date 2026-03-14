import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getFilteredVocabIds } from '../utils/filterUtils'
import {
  Box, Card, CardContent, Typography, Button,
  LinearProgress, Chip, CircularProgress, TextField,
  useMediaQuery, useTheme
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

function ConjugationDrill({ activeFilter = {}, cardCount, selectedForms, onBack }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState({ got: 0, again: 0 })
  const [done, setDone] = useState(false)

  useEffect(() => { fetchCards() }, [])

  async function fetchCards() {
    setLoading(true)
    let query = supabase.from('vocabulary')
      .select(`*, word_types(type_name), jlpt_levels(level), conjugations(*)`)
    const ids = await getFilteredVocabIds(activeFilter)
    if (ids !== null) {
      if (ids.length === 0) { setCards([]); setLoading(false); return }
      query = query.in('id', ids)
    }
    const { data, error } = await query
    if (error) console.error(error)
    const expanded = []
    ;(data || []).forEach(word => {
      word.conjugations?.filter(c => selectedForms.includes(c.form_type)).forEach(conj => {
        expanded.push({
          word: word.word, reading: word.reading, meaning: word.meaning,
          word_type: word.word_types?.type_name, jlpt_level: word.jlpt_levels?.level,
          lesson_number: word.lesson_number, conjugation: conj
        })
      })
    })
    setCards(expanded.sort(() => Math.random() - 0.5).slice(0, cardCount))
    setLoading(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const correct = answer.trim() === cards[current].conjugation.conjugated_word.trim()
    setIsCorrect(correct); setSubmitted(true)
    setScore(s => ({ got: correct ? s.got + 1 : s.got, again: correct ? s.again : s.again + 1 }))
  }

  function handleNext() {
    if (current + 1 >= cards.length) setDone(true)
    else { setCurrent(c => c + 1); setAnswer(''); setSubmitted(false); setIsCorrect(false) }
  }

  function handleRestart() {
    setCurrent(0); setAnswer(''); setSubmitted(false); setIsCorrect(false)
    setScore({ got: 0, again: 0 }); setDone(false)
    setCards(prev => [...prev].sort(() => Math.random() - 0.5))
  }

  if (loading) return <Box textAlign="center" mt={10}><CircularProgress /></Box>

  if (cards.length === 0) return (
    <Box textAlign="center" mt={10}>
      <Typography variant="h4" mb={2}>😅</Typography>
      <Typography color="text.secondary" mb={3}>No conjugations found for this filter!</Typography>
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
    </Box>
  )

  if (done) {
    const total = cards.length
    const pct = Math.round((score.got / total) * 100)
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', textAlign: 'center', mt: isMobile ? 2 : 4 }}>
        <Typography variant="h4" mb={1}>{pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'}</Typography>
        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" mb={1}>Session Complete!</Typography>
        <Typography color="text.secondary" mb={2}>Here's how you did:</Typography>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant={isMobile ? 'h3' : 'h2'} fontWeight="bold"
              color={pct >= 80 ? 'success.main' : pct >= 50 ? 'warning.main' : 'error.main'}>{pct}%</Typography>
            <Typography color="text.secondary">{score.got} / {total} correct</Typography>
            <Box display="flex" justifyContent="center" gap={2} mt={2} flexWrap="wrap">
              <Chip label={`✅ Got it: ${score.got}`} color="success" variant="outlined" />
              <Chip label={`🔁 Again: ${score.again}`} color="error" variant="outlined" />
            </Box>
          </CardContent>
        </Card>
        <Box display="flex" gap={1.5} justifyContent="center" flexWrap="wrap">
          <Button variant="contained" onClick={handleRestart} size={isMobile ? 'small' : 'medium'}
            sx={{ backgroundColor: '#1a3a5c' }}>🔄 Review Again</Button>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}
            size={isMobile ? 'small' : 'medium'}>Back</Button>
        </Box>
      </Box>
    )
  }

  const card = cards[current]
  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
        <Typography variant="body2" color="text.secondary">{current + 1} / {cards.length}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={(current / cards.length) * 100}
        sx={{ mb: 2, height: 6, borderRadius: 3, backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': { backgroundColor: '#1a3a5c' } }} />

      <Card sx={{ mb: 2, boxShadow: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: isMobile ? 2.5 : 4 }}>
          <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold" mb={0.5}>{card.word}</Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>{card.meaning}</Typography>
          <Box display="flex" justifyContent="center" gap={1} mb={2} flexWrap="wrap">
            {card.jlpt_level && <Chip label={card.jlpt_level} size="small" color="primary" />}
            {card.word_type && <Chip label={card.word_type} size="small" variant="outlined" />}
            {card.lesson_number && <Chip label={`L${card.lesson_number}`} size="small" variant="outlined" />}
          </Box>
          <Box sx={{ backgroundColor: '#f0f4f8', borderRadius: 2, p: isMobile ? 1.5 : 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Give the conjugation:</Typography>
            <Typography variant={isMobile ? 'body1' : 'h6'} fontWeight="bold" color="#1a3a5c">
              {card.conjugation.form_type}
            </Typography>
          </Box>
          {!submitted ? (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField fullWidth autoFocus placeholder="Type answer in Japanese..."
                value={answer} onChange={e => setAnswer(e.target.value)}
                size="small" sx={{ mb: 1.5 }} inputProps={{ lang: 'ja' }} />
              <Button type="submit" fullWidth variant="contained" size="large"
                disabled={!answer.trim()}
                sx={{ backgroundColor: '#1a3a5c', py: isMobile ? 1.2 : 1.5 }}>
                ✅ Check Answer
              </Button>
            </Box>
          ) : (
            <Box>
              <Box sx={{ borderRadius: 2, p: 1.5, mb: 1.5, backgroundColor: isCorrect ? '#e8f5e9' : '#ffebee' }}>
                {isCorrect ? (
                  <Typography variant="h6" color="success.main" fontWeight="bold">🎉 Correct!</Typography>
                ) : (
                  <Box>
                    <Typography variant="h6" color="error.main" fontWeight="bold" mb={0.5}>❌ Wrong!</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">Your answer:</Typography>
                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'error.main' }}>{answer}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>Correct answer:</Typography>
                    <Typography variant={isMobile ? 'body1' : 'h6'} color="success.main" fontWeight="bold">
                      {card.conjugation.conjugated_word}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Button fullWidth variant="contained" size="large" onClick={handleNext}
                sx={{ backgroundColor: '#1a3a5c', py: isMobile ? 1.2 : 1.5 }}>Next →</Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default ConjugationDrill