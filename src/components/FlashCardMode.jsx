import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getFilteredVocabIds } from '../utils/filterUtils'
import { getSavedWordIds, toggleSavedWord, saveWord } from '../utils/savedWordsUtils'
import {
  Box, Card, CardContent, Typography, Button,
  LinearProgress, Chip, CircularProgress, IconButton, Tooltip,
  useMediaQuery, useTheme
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'

function speak(text) {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  window.speechSynthesis.speak(utterance)
}

function FlashcardMode({ activeFilter = {}, cardCount, onBack, preloadedCards = null, userId = null }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [cards, setCards] = useState([])
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const [score, setScore] = useState({ got: 0, again: 0 })
  const [reviewed, setReviewed] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [done, setDone] = useState(false)
  const [missedCards, setMissedCards] = useState(new Set())
  const [reviewingMissed, setReviewingMissed] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingIds, setSavingIds] = useState(new Set())

  useEffect(() => {
    fetchCards()
    if (userId) getSavedWordIds(userId).then(setSavedIds)
  }, [])

  async function fetchCards() {
    setLoading(true)
    let shuffled = []
    if (preloadedCards) {
      shuffled = [...preloadedCards].sort(() => Math.random() - 0.5)
    } else {
      let query = supabase.from('vocabulary')
        .select(`*, word_types(type_name), jlpt_levels(level), books(book_name), example_sentences(*), conjugations(*)`)
      const ids = await getFilteredVocabIds(activeFilter)
      if (ids !== null) {
        if (ids.length === 0) { setCards([]); setLoading(false); return }
        query = query.in('id', ids)
      }
      const { data, error } = await query
      if (error) console.error(error)
      shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, cardCount)
    }
    setCards(shuffled)
    setQueue(shuffled.slice(1))
    setCurrent(shuffled[0] || null)
    setTotalCount(shuffled.length)
    setReviewed(1)
    setLoading(false)
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

  async function handleSaveAllMissed(missed) {
    if (!userId) return
    await Promise.all(missed.map(card => saveWord(userId, card.id)))
    setSavedIds(prev => {
      const next = new Set(prev)
      missed.forEach(c => next.add(c.id))
      return next
    })
  }

  function handleAnswer(correct) {
    setScore(s => ({ got: correct ? s.got + 1 : s.got, again: correct ? s.again : s.again + 1 }))
    let newQueue = [...queue]
    if (!correct) {
      setMissedCards(prev => new Set(prev).add(current.id))
      const insertAt = newQueue.length <= 1 ? newQueue.length : Math.floor(Math.random() * (newQueue.length - 1)) + 1
      newQueue.splice(insertAt, 0, current)
      setTotalCount(t => t + 1)
    }
    if (newQueue.length === 0) { setDone(true) }
    else { setCurrent(newQueue[0]); setQueue(newQueue.slice(1)); setReviewed(r => r + 1); setFlipped(false) }
  }

  function handleRestart() {
    const reshuffled = [...cards].sort(() => Math.random() - 0.5)
    setQueue(reshuffled.slice(1)); setCurrent(reshuffled[0] || null)
    setTotalCount(reshuffled.length); setReviewed(1); setFlipped(false)
    setScore({ got: 0, again: 0 }); setDone(false); setMissedCards(new Set()); setReviewingMissed(false)
  }

  function handleReviewMissed(missedList) {
    const reshuffled = [...missedList].sort(() => Math.random() - 0.5)
    setCards(reshuffled); setQueue(reshuffled.slice(1)); setCurrent(reshuffled[0] || null)
    setTotalCount(reshuffled.length); setReviewed(1); setFlipped(false)
    setScore({ got: 0, again: 0 }); setDone(false); setMissedCards(new Set()); setReviewingMissed(true)
  }

  if (loading) return <Box textAlign="center" mt={10}><CircularProgress /></Box>

  if (!current && !done) return (
    <Box textAlign="center" mt={10}>
      <Typography variant="h4" mb={2}>😅</Typography>
      <Typography color="text.secondary" mb={3}>No words found for this filter!</Typography>
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
    </Box>
  )

  if (done) {
    const total = cards.length
    const pct = Math.round((score.got / total) * 100)
    const missed = cards.filter(c => missedCards.has(c.id))
    const allMissedSaved = missed.every(c => savedIds.has(c.id))
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', textAlign: 'center', mt: isMobile ? 2 : 4, px: isMobile ? 1 : 0 }}>
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

        {missed.length > 0 && (
          <Box sx={{ textAlign: 'left', mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" fontWeight="bold">📋 Words to review ({missed.length})</Typography>
              {userId && (
                <Button size="small" variant={allMissedSaved ? 'outlined' : 'contained'}
                  startIcon={<BookmarkIcon sx={{ fontSize: 16 }} />}
                  disabled={allMissedSaved}
                  onClick={() => handleSaveAllMissed(missed)}
                  sx={{ fontSize: '11px', py: 0.5,
                    ...(allMissedSaved ? {} : { backgroundColor: '#1a3a5c' }) }}>
                  {allMissedSaved ? 'All Saved ✓' : 'Save All'}
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {missed.map(card => (
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
          {missed.length > 0 && (
            <Button variant="contained" color="error" onClick={() => handleReviewMissed(missed)}
              size={isMobile ? 'small' : 'medium'} sx={{ py: 1 }}>
              🔁 Review Missed ({missed.length})
            </Button>
          )}
          <Button variant="contained" onClick={handleRestart}
            size={isMobile ? 'small' : 'medium'}
            sx={{ backgroundColor: '#1a3a5c', py: 1 }}>
            🔄 {reviewingMissed ? 'Restart Missed' : 'Review Again'}
          </Button>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}
            size={isMobile ? 'small' : 'medium'}>
            Back
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', px: isMobile ? 0 : 0 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
        <Typography variant="body2" color="text.secondary">{reviewed} / {totalCount}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={(reviewed / totalCount) * 100}
        sx={{ mb: 2, height: 6, borderRadius: 3, backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': { backgroundColor: '#1a3a5c' } }} />

      <Card onClick={() => !flipped && setFlipped(true)}
        sx={{
          mb: 2, cursor: flipped ? 'default' : 'pointer',
          minHeight: isMobile ? 180 : 220,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 3, '&:hover': !flipped ? { boxShadow: 6 } : {}
        }}>
        <CardContent sx={{ textAlign: 'center', width: '100%', py: isMobile ? 2 : 3 }}>
          {!flipped ? (
            <Box>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                🇯🇵 What does this mean?
              </Typography>
              <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold">{current.word}</Typography>
              <Typography variant="caption" color="text.disabled" mt={2} display="block">tap to reveal →</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Answer</Typography>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={0.5}>
                <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold">{current.word}</Typography>
                <IconButton size="small" onClick={() => speak(current.reading || current.word)} sx={{ color: '#1a3a5c' }}>
                  <VolumeUpIcon fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>
                {userId && (
                  <IconButton size="small" disabled={savingIds.has(current.id)}
                    onClick={e => { e.stopPropagation(); handleToggleSave(current.id) }}
                    sx={{ color: savedIds.has(current.id) ? '#1a3a5c' : '#b0bec5' }}>
                    {savedIds.has(current.id)
                      ? <BookmarkIcon fontSize={isMobile ? 'small' : 'medium'} />
                      : <BookmarkBorderIcon fontSize={isMobile ? 'small' : 'medium'} />}
                  </IconButton>
                )}
              </Box>
              {current.reading && (
                <Typography variant="body1" color="primary" mb={0.5}>{current.reading}</Typography>
              )}
              <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" mb={1}>{current.meaning}</Typography>
              <Box display="flex" justifyContent="center" gap={1} mt={1} flexWrap="wrap">
                {current.jlpt_levels?.level && <Chip label={current.jlpt_levels.level} size="small" color="primary" />}
                {current.word_types?.type_name && <Chip label={current.word_types.type_name} size="small" variant="outlined" />}
                {current.lesson_number && <Chip label={`L${current.lesson_number}`} size="small" variant="outlined" />}
                {current.books?.book_name && <Chip label={current.books.book_name} size="small" variant="outlined" sx={{ color: 'text.secondary' }} />}
              </Box>
              {current.example_sentences?.length > 0 && (
                <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 1, p: 1.5, mt: 1.5, textAlign: 'left' }}>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                    <Typography variant="body2" color="warning.dark" sx={{ flex: 1 }}>
                      {current.example_sentences[0].japanese_sentence}
                    </Typography>
                    <IconButton size="small" onClick={() => speak(current.example_sentences[0].japanese_sentence)}
                      sx={{ color: '#b0bec5', ml: 0.5, mt: '-4px', flexShrink: 0 }}>
                      <VolumeUpIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {current.example_sentences[0].english_translation}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {flipped && (
        <Box display="flex" gap={1.5}>
          <Button fullWidth variant="outlined" color="error" size="large" onClick={() => handleAnswer(false)}
            sx={{ py: isMobile ? 1.2 : 1.5, fontSize: isMobile ? '14px' : '16px' }}>
            🔁 Again
          </Button>
          <Button fullWidth variant="contained" color="success" size="large" onClick={() => handleAnswer(true)}
            sx={{ py: isMobile ? 1.2 : 1.5, fontSize: isMobile ? '14px' : '16px' }}>
            ✅ Got it!
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default FlashcardMode