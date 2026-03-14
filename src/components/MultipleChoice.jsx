import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getFilteredVocabIds } from '../utils/filterUtils'
import { getSavedWordIds, toggleSavedWord, saveWord } from '../utils/savedWordsUtils'
import {
  Box, Card, CardContent, Typography, Button,
  LinearProgress, Chip, CircularProgress, IconButton,
  useMediaQuery, useTheme
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'

function MultipleChoice({ activeFilter = {}, cardCount, onBack, userId = null }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState({ got: 0, again: 0 })
  const [done, setDone] = useState(false)
  const [missedCards, setMissedCards] = useState([])
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingIds, setSavingIds] = useState(new Set())

  useEffect(() => {
    fetchCards()
    if (userId) getSavedWordIds(userId).then(setSavedIds)
  }, [])

  async function fetchCards() {
    setLoading(true)
    let query = supabase.from('vocabulary').select(`*, word_types(type_name), jlpt_levels(level)`)
    const ids = await getFilteredVocabIds(activeFilter)
    if (ids !== null) {
      if (ids.length === 0) { setCards([]); setLoading(false); return }
      query = query.in('id', ids)
    }
    const { data, error } = await query
    if (error) console.error(error)
    const allWords = data || []
    if (allWords.length < 4) { setCards([]); setLoading(false); return }
    const shuffled = [...allWords].sort(() => Math.random() - 0.5).slice(0, cardCount)
    const built = shuffled.map(word => {
      const isJpEn = Math.random() > 0.5
      const wrongs = [...allWords.filter(w => w.id !== word.id)].sort(() => Math.random() - 0.5).slice(0, 3)
      const choices = [
        { label: isJpEn ? word.meaning : word.word, isCorrect: true },
        ...wrongs.map(w => ({ label: isJpEn ? w.meaning : w.word, isCorrect: false }))
      ].sort(() => Math.random() - 0.5)
      return {
        id: word.id, word: word.word, reading: word.reading, meaning: word.meaning,
        jlpt_level: word.jlpt_levels?.level, word_type: word.word_types?.type_name,
        lesson_number: word.lesson_number, isJpEn, choices
      }
    })
    setCards(built); setMissedCards([]); setLoading(false)
  }

  async function handleToggleSave(vocabId) {
    if (!userId) return
    setSavingIds(prev => new Set(prev).add(vocabId))
    const nowSaved = await toggleSavedWord(userId, vocabId, savedIds)
    setSavedIds(prev => {
      const next = new Set(prev)
      nowSaved ? next.add(vocabId) : next.delete(vocabId)
      return next
    })
    setSavingIds(prev => { const next = new Set(prev); next.delete(vocabId); return next })
  }

  async function handleSaveAllMissed() {
    if (!userId) return
    await Promise.all(missedCards.map(card => saveWord(userId, card.id)))
    setSavedIds(prev => {
      const next = new Set(prev)
      missedCards.forEach(c => next.add(c.id))
      return next
    })
  }

  function handleSelect(choice) {
    if (selected !== null) return
    setSelected(choice)
    const correct = choice.isCorrect
    setScore(s => ({ got: correct ? s.got + 1 : s.got, again: correct ? s.again : s.again + 1 }))
    if (!correct) setMissedCards(prev => [...prev, cards[current]])
  }

  function handleNext() {
    if (current + 1 >= cards.length) setDone(true)
    else { setCurrent(c => c + 1); setSelected(null) }
  }

  function handleRestart() {
    setCurrent(0); setSelected(null); setScore({ got: 0, again: 0 }); setDone(false); setMissedCards([])
    fetchCards()
  }

  if (loading) return <Box textAlign="center" mt={10}><CircularProgress /></Box>

  if (cards.length === 0) return (
    <Box textAlign="center" mt={10}>
      <Typography variant="h4" mb={2}>😅</Typography>
      <Typography color="text.secondary" mb={3}>Need at least 4 words for multiple choice!</Typography>
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
    </Box>
  )

  if (done) {
    const total = cards.length
    const pct = Math.round((score.got / total) * 100)
    const allMissedSaved = missedCards.every(c => savedIds.has(c.id))
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

        {missedCards.length > 0 && (
          <Box sx={{ textAlign: 'left', mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" fontWeight="bold">📋 Words to review ({missedCards.length})</Typography>
              {userId && (
                <Button size="small" variant={allMissedSaved ? 'outlined' : 'contained'}
                  startIcon={<BookmarkIcon sx={{ fontSize: 16 }} />}
                  disabled={allMissedSaved}
                  onClick={handleSaveAllMissed}
                  sx={{ fontSize: '11px', py: 0.5,
                    ...(allMissedSaved ? {} : { backgroundColor: '#1a3a5c' }) }}>
                  {allMissedSaved ? 'All Saved ✓' : 'Save All'}
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {missedCards.map(card => (
                <Card key={card.id} variant="outlined" sx={{ borderColor: '#ffcccc' }}>
                  <CardContent sx={{ py: '8px !important', px: 1.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight="bold" variant="body2" display="inline">{card.word}</Typography>
                        {card.reading && <Typography variant="caption" color="primary" ml={1}>{card.reading}</Typography>}
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption" color="text.secondary">{card.meaning}</Typography>
                        {userId && (
                          <IconButton size="small" disabled={savingIds.has(card.id)}
                            onClick={() => handleToggleSave(card.id)}
                            sx={{ color: savedIds.has(card.id) ? '#1a3a5c' : '#b0bec5' }}>
                            {savedIds.has(card.id)
                              ? <BookmarkIcon sx={{ fontSize: 18 }} />
                              : <BookmarkBorderIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

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
        <CardContent sx={{ textAlign: 'center', py: isMobile ? 2 : 4 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            {card.isJpEn ? '🇯🇵 What does this mean?' : '🇬🇧 Which word matches this meaning?'}
          </Typography>
          {card.isJpEn ? (
            <Box mb={1.5}>
              <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold">{card.word}</Typography>
              {selected && card.reading && (
                <Typography variant="body2" color="primary" mt={0.5}>{card.reading}</Typography>
              )}
            </Box>
          ) : (
            <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" mb={1.5}>{card.meaning}</Typography>
          )}
          <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
            {card.jlpt_level && <Chip label={card.jlpt_level} size="small" color="primary" />}
            {card.word_type && <Chip label={card.word_type} size="small" variant="outlined" />}
            {card.lesson_number && <Chip label={`L${card.lesson_number}`} size="small" variant="outlined" />}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        {card.choices.map((choice, i) => {
          let bgColor = 'white', borderColor = '#e0e0e0', textColor = 'text.primary'
          if (selected !== null) {
            if (choice.isCorrect) { bgColor = '#e8f5e9'; borderColor = '#4caf50'; textColor = 'success.main' }
            else if (selected === choice) { bgColor = '#ffebee'; borderColor = '#f44336'; textColor = 'error.main' }
          }
          return (
            <Card key={i} onClick={() => handleSelect(choice)}
              sx={{ cursor: selected !== null ? 'default' : 'pointer', border: `2px solid ${borderColor}`,
                backgroundColor: bgColor, transition: 'all 0.15s',
                '&:hover': selected === null ? { boxShadow: 3, borderColor: '#1a3a5c' } : {} }}>
              <CardContent sx={{ py: isMobile ? '10px !important' : '12px !important', px: isMobile ? 1.5 : 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" color="text.disabled" sx={{ minWidth: 20 }}>
                    {String.fromCharCode(65 + i)}.
                  </Typography>
                  <Typography variant={isMobile ? 'body2' : 'body1'} color={textColor}
                    fontWeight={choice.isCorrect && selected ? 'bold' : 'normal'}>
                    {choice.label}
                  </Typography>
                  {selected !== null && choice.isCorrect && <Typography ml="auto">✅</Typography>}
                  {selected === choice && !choice.isCorrect && <Typography ml="auto">❌</Typography>}
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {selected !== null && (
        <Button fullWidth variant="contained" size="large" onClick={handleNext}
          sx={{ backgroundColor: '#1a3a5c', py: isMobile ? 1.2 : 1.5 }}>Next →</Button>
      )}
    </Box>
  )
}

export default MultipleChoice