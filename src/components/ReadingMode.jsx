import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { getFilteredVocabIds } from '../utils/filterUtils'
import { generateReadingExercise } from '../utils/geminiService'
import {
  Box, Card, CardContent, Typography, Button, Chip,
  CircularProgress, Alert, Divider,
  Radio, RadioGroup, FormControlLabel, FormControl, Collapse,
  useMediaQuery, useTheme
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'

const TOPICS = [
  { value: '日常生活', label: '日常生活 — Daily Life' },
  { value: '買い物', label: '買い物 — Shopping' },
  { value: '食べ物・飲み物', label: '食べ物・飲み物 — Food & Drinks' },
  { value: '旅行', label: '旅行 — Travel' },
  { value: '学校・勉強', label: '学校・勉強 — School & Study' },
  { value: '仕事・職場', label: '仕事・職場 — Work' },
  { value: '健康・病院', label: '健康・病院 — Health & Hospital' },
  { value: '趣味・余暇', label: '趣味・余暇 — Hobbies & Leisure' },
  { value: '天気', label: '天気 — Weather' },
  { value: '交通', label: '交通 — Transportation' },
]

function ReadingMode({ activeFilter, onBack }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [exercise, setExercise] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const [showExplanations, setShowExplanations] = useState({})

  async function handleGenerate() {
    if (!topic) return
    setGenerating(true); setError(''); setExercise(null)
    setAnswers({}); setSubmitted(false); setScore(null); setShowExplanations({})
    try {
      let vocabQuery = supabase.from('vocabulary').select('word, reading')
      const ids = await getFilteredVocabIds(activeFilter)
      if (ids !== null) {
        if (ids.length === 0) {
          setError('No words found for the selected filter.')
          setGenerating(false); return
        }
        vocabQuery = vocabQuery.in('id', ids)
      }
      const { data: vocabData, error: vocabError } = await vocabQuery
      if (vocabError) throw vocabError
      const words = (vocabData || []).map(v => v.word)
      const level = activeFilter?.levels?.length > 0 ? activeFilter.levels[0] : 'N4'
      const result = await generateReadingExercise({ vocabWords: words, topic, level })
      setExercise(result)
    } catch (err) {
      console.error(err)
      setError('Failed to generate exercise. Please try again.')
    }
    setGenerating(false)
  }

  function handleAnswer(qIndex, value) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIndex]: value }))
  }

  function handleSubmit() {
    if (!exercise) return
    const correct = exercise.questions.filter((q, i) => answers[i] === q.answer).length
    setScore(correct); setSubmitted(true)
  }

  function handleRetry() {
    setExercise(null); setAnswers({}); setSubmitted(false)
    setScore(null); setShowExplanations({}); setError('')
  }

  function toggleExplanation(i) {
    setShowExplanations(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const allAnswered = exercise && Object.keys(answers).length === exercise.questions.length

  // SETUP SCREEN
  if (!exercise && !generating) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
        </Box>
        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" mb={0.5}>読解 — Reading Comprehension</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          AI will generate an original JLPT-style passage using your vocabulary words.
        </Typography>

        <Card sx={{ mb: 2, backgroundColor: '#f0f4f8' }} elevation={0}>
          <CardContent sx={{ py: '10px !important' }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>
              📚 VOCABULARY SOURCE
            </Typography>
            <Typography variant="body2" color="#1a3a5c" fontWeight="bold">
              {getFilterSummary(activeFilter)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
            <Typography fontWeight="bold" variant={isMobile ? 'body2' : 'body1'} mb={1.5}>🗾 Choose a Topic</Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {TOPICS.map(t => (
                <Chip key={t.value}
                  label={isMobile ? t.value : t.label}
                  onClick={() => setTopic(t.value)}
                  variant={topic === t.value ? 'filled' : 'outlined'}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: topic === t.value ? '#1a3a5c' : 'transparent',
                    color: topic === t.value ? 'white' : '#1a3a5c',
                    borderColor: '#1a3a5c',
                    '&:hover': { backgroundColor: topic === t.value ? '#1a3a5c' : '#e8f0fe' }
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Button fullWidth variant="contained" size="large" disabled={!topic} onClick={handleGenerate}
          startIcon={<AutoAwesomeIcon />}
          sx={{ backgroundColor: '#1a3a5c', py: isMobile ? 1.2 : 1.5, fontSize: isMobile ? '14px' : '16px' }}>
          Generate Reading Exercise ✨
        </Button>
      </Box>
    )
  }

  // LOADING
  if (generating) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', mt: 8 }}>
        <CircularProgress size={48} sx={{ color: '#1a3a5c', mb: 3 }} />
        <Typography variant="h6" fontWeight="bold" mb={1}>Generating your exercise...</Typography>
        <Typography variant="body2" color="text.secondary">
          AI is writing a passage using your vocabulary words 📝
        </Typography>
        <Typography variant="caption" color="text.disabled" mt={1} display="block">
          This may take a few seconds...
        </Typography>
      </Box>
    )
  }

  // EXERCISE SCREEN
  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={handleRetry}>Back</Button>
        <Chip label={topic} size="small" sx={{ backgroundColor: '#1a3a5c', color: 'white' }} />
      </Box>

      {submitted && (
        <Alert
          severity={score === exercise.questions.length ? 'success' : score >= exercise.questions.length / 2 ? 'warning' : 'error'}
          sx={{ mb: 2, fontWeight: 'bold', fontSize: isMobile ? '13px' : '15px' }}>
          {score === exercise.questions.length ? '🎉 Perfect score!' : `${score} / ${exercise.questions.length} correct`}
          {score !== exercise.questions.length && ' — Review the explanations below!'}
        </Alert>
      )}

      {/* PASSAGE */}
      <Card sx={{ mb: 2, borderLeft: '4px solid #1a3a5c' }}>
        <CardContent sx={{ py: isMobile ? 1.5 : 2 }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
            📄 PASSAGE
          </Typography>
          <Typography variant={isMobile ? 'body2' : 'body1'}
            sx={{ lineHeight: 2.2, whiteSpace: 'pre-wrap', fontFamily: '"Noto Sans JP", sans-serif' }}>
            {exercise.passage}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
        📝 QUESTIONS
      </Typography>

      {exercise.questions.map((q, i) => {
        const userAnswer = answers[i]
        const isCorrect = submitted && userAnswer === q.answer
        const isWrong = submitted && userAnswer && userAnswer !== q.answer
        const unanswered = submitted && !userAnswer

        return (
          <Card key={i} sx={{
            mb: 1.5,
            border: submitted
              ? isCorrect ? '2px solid #4caf50'
              : isWrong ? '2px solid #f44336'
              : unanswered ? '2px solid #ff9800'
              : '1px solid #e0e0e0'
              : '1px solid #e0e0e0'
          }}>
            <CardContent sx={{ py: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
              <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                <Chip label={`Q${i + 1}`} size="small"
                  sx={{ backgroundColor: '#1a3a5c', color: 'white', minWidth: 32, fontWeight: 'bold', height: 20 }} />
                <Typography variant={isMobile ? 'body2' : 'body1'} fontWeight="bold" sx={{ lineHeight: 1.6 }}>
                  {q.question}
                </Typography>
              </Box>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup value={userAnswer || ''} onChange={e => handleAnswer(i, e.target.value)}>
                  {q.choices.map((choice, ci) => {
                    const letter = choice[0]
                    const isChoiceCorrect = submitted && letter === q.answer
                    const isChoiceWrong = submitted && userAnswer === letter && letter !== q.answer
                    return (
                      <FormControlLabel key={ci} value={letter} disabled={submitted}
                        control={<Radio size="small"
                          sx={{ color: '#1a3a5c', '&.Mui-checked': { color: '#1a3a5c' }, py: 0.5 }} />}
                        label={
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant={isMobile ? 'caption' : 'body2'}
                              sx={{
                                color: isChoiceCorrect ? 'success.main' : isChoiceWrong ? 'error.main' : 'text.primary',
                                fontWeight: isChoiceCorrect ? 'bold' : 'normal'
                              }}>
                              {choice}
                            </Typography>
                            {isChoiceCorrect && <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />}
                            {isChoiceWrong && <CancelIcon sx={{ fontSize: 14, color: 'error.main' }} />}
                          </Box>
                        }
                        sx={{ mb: 0, px: 0.5, borderRadius: 1,
                          backgroundColor: isChoiceCorrect ? '#e8f5e9' : isChoiceWrong ? '#ffebee' : 'transparent' }}
                      />
                    )
                  })}
                </RadioGroup>
              </FormControl>

              {submitted && (
                <Box mt={1}>
                  <Button size="small" onClick={() => toggleExplanation(i)}
                    sx={{ color: '#1a3a5c', textTransform: 'none', fontSize: '11px', p: 0 }}>
                    {showExplanations[i] ? '▲ Hide explanation' : '▼ Show explanation'}
                  </Button>
                  <Collapse in={!!showExplanations[i]}>
                    <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 1, p: 1.5, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        ✅ Correct answer: <strong>{q.answer}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {q.explanation}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </CardContent>
          </Card>
        )
      })}

      {!submitted ? (
        <Button fullWidth variant="contained" size="large" disabled={!allAnswered} onClick={handleSubmit}
          sx={{ backgroundColor: '#1a3a5c', py: isMobile ? 1.2 : 1.5, mt: 1 }}>
          ✅ Submit Answers
        </Button>
      ) : (
        <Box display="flex" gap={1.5} mt={2} flexDirection={isMobile ? 'column' : 'row'}>
          <Button fullWidth variant="contained" onClick={handleGenerate}
            startIcon={<AutoAwesomeIcon />}
            sx={{ backgroundColor: '#1a3a5c', py: isMobile ? 1.2 : 1.5 }}>
            Generate New Exercise
          </Button>
          <Button fullWidth variant="outlined" onClick={handleRetry}
            sx={{ borderColor: '#1a3a5c', color: '#1a3a5c', py: isMobile ? 1.2 : 1.5 }}>
            Change Topic
          </Button>
        </Box>
      )}
    </Box>
  )
}

function getFilterSummary(activeFilter) {
  if (!activeFilter) return 'All words'
  const { levels, bookRanges } = activeFilter
  if ((!levels || levels.length === 0) && (!bookRanges || bookRanges.every(r => r.from === null && r.to === null))) {
    return 'All words'
  }
  const parts = []
  if (levels?.length > 0) parts.push(levels.join(', '))
  bookRanges?.forEach(r => {
    if (r.from !== null || r.to !== null) {
      const range = r.from !== null && r.to !== null ? `L${r.from}–${r.to}`
        : r.from !== null ? `L${r.from}+` : `up to L${r.to}`
      parts.push(range)
    }
  })
  return parts.join(' | ') || 'All words'
}

export default ReadingMode