import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  Box, Typography, Chip, CircularProgress, Accordion, AccordionSummary,
  AccordionDetails, Divider, Button, FormControl, InputLabel, Select,
  MenuItem, RadioGroup, FormControlLabel, Radio, Alert, Pagination
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import QuizIcon from '@mui/icons-material/Quiz'

const NAVY = '#1a3a5c'
const LESSONS_BOOK1 = { from: 1, to: 25 }
const LESSONS_BOOK2 = { from: 26, to: 50 }
const PAGE_SIZE = 20

export default function GrammarMode() {
  const [grammarPoints, setGrammarPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(1)

  // Filters
  const [book, setBook] = useState('all')
  const [jlptLevel, setJlptLevel] = useState('all')
  const [lessonFrom, setLessonFrom] = useState('')
  const [lessonTo, setLessonTo] = useState('')

  // Exercise state: { [grammarPointId]: { [exerciseId]: selectedAnswer } }
  const [answers, setAnswers] = useState({})
  // Revealed: { [grammarPointId]: boolean }
  const [revealed, setRevealed] = useState({})

  useEffect(() => {
    fetchGrammarPoints()
  }, [book, jlptLevel, lessonFrom, lessonTo])

  async function fetchGrammarPoints() {
    setLoading(true)
    setExpanded(null)
    setAnswers({})
    setRevealed({})
    setPage(1)

    let query = supabase
      .from('grammar_points')
      .select(`
        *,
        grammar_examples ( * ),
        grammar_exercises ( * )
      `)
      .order('lesson_number', { ascending: true })
      .order('order_in_lesson', { ascending: true })

    if (book === '1') {
      query = query.gte('lesson_number', LESSONS_BOOK1.from).lte('lesson_number', LESSONS_BOOK1.to)
    } else if (book === '2') {
      query = query.gte('lesson_number', LESSONS_BOOK2.from).lte('lesson_number', LESSONS_BOOK2.to)
    }

    if (jlptLevel !== 'all') query = query.eq('jlpt_level', jlptLevel)
    if (lessonFrom !== '') query = query.gte('lesson_number', parseInt(lessonFrom))
    if (lessonTo !== '') query = query.lte('lesson_number', parseInt(lessonTo))

    const { data, error } = await query
    if (error) console.error(error)
    else setGrammarPoints(data || [])
    setLoading(false)
  }

  function handleAccordion(id) {
    setExpanded(prev => prev === id ? null : id)
  }

  function handleAnswerSelect(gpId, exId, value) {
    setAnswers(prev => ({
      ...prev,
      [gpId]: { ...(prev[gpId] || {}), [exId]: value }
    }))
  }

  function handleReveal(gpId) {
    setRevealed(prev => ({ ...prev, [gpId]: true }))
  }

  function handleReset(gpId) {
    setAnswers(prev => ({ ...prev, [gpId]: {} }))
    setRevealed(prev => ({ ...prev, [gpId]: false }))
  }

  function getScore(gp) {
    const exercises = (gp.grammar_exercises || []).sort((a, b) => a.order_in_point - b.order_in_point)
    const gpAnswers = answers[gp.id] || {}
    let correct = 0
    exercises.forEach(ex => {
      if (gpAnswers[ex.id] === ex.correct_answer) correct++
    })
    return { correct, total: exercises.length }
  }

  function handlePageChange(_, val) {
    setPage(val)
    setExpanded(null)
    window.scrollTo(0, 0)
  }

  const lessonOptions = Array.from({ length: 50 }, (_, i) => i + 1)

  const totalPages = Math.ceil(grammarPoints.length / PAGE_SIZE)
  const paginated = grammarPoints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const rangeStart = grammarPoints.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, grammarPoints.length)

  return (
    <Box>
      {/* FILTERS */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Book</InputLabel>
          <Select value={book} label="Book" onChange={e => { setBook(e.target.value); setLessonFrom(''); setLessonTo('') }}>
            <MenuItem value="all">All Books</MenuItem>
            <MenuItem value="1">Book 1 (L1–25)</MenuItem>
            <MenuItem value="2">Book 2 (L26–50)</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>JLPT Level</InputLabel>
          <Select value={jlptLevel} label="JLPT Level" onChange={e => setJlptLevel(e.target.value)}>
            <MenuItem value="all">All Levels</MenuItem>
            <MenuItem value="N5">N5</MenuItem>
            <MenuItem value="N4">N4</MenuItem>
            <MenuItem value="N3">N3</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Lesson From</InputLabel>
          <Select value={lessonFrom} label="Lesson From" onChange={e => { setLessonFrom(e.target.value); setPage(1) }}>
            <MenuItem value="">—</MenuItem>
            {lessonOptions.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Lesson To</InputLabel>
          <Select value={lessonTo} label="Lesson To" onChange={e => { setLessonTo(e.target.value); setPage(1) }}>
            <MenuItem value="">—</MenuItem>
            {lessonOptions.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* RESULTS COUNT */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {grammarPoints.length === 0
          ? '0 grammar points found'
          : `Showing ${rangeStart}–${rangeEnd} of ${grammarPoints.length} grammar point${grammarPoints.length !== 1 ? 's' : ''}`
        }
      </Typography>

      {/* LOADING */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress sx={{ color: NAVY }} />
        </Box>
      )}

      {/* EMPTY */}
      {!loading && grammarPoints.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 6, color: 'text.secondary' }}>
          <Typography>No grammar points found for the selected filters.</Typography>
        </Box>
      )}

      {/* GRAMMAR POINTS LIST */}
      {!loading && paginated.map(gp => {
        const examples = (gp.grammar_examples || []).sort((a, b) => a.order_in_point - b.order_in_point)
        const exercises = (gp.grammar_exercises || []).sort((a, b) => a.order_in_point - b.order_in_point)
        const gpAnswers = answers[gp.id] || {}
        const isRevealed = revealed[gp.id] || false
        const { correct, total } = getScore(gp)
        const allAnswered = total > 0 && Object.keys(gpAnswers).length === total

        return (
          <Accordion
            key={gp.id}
            expanded={expanded === gp.id}
            onChange={() => handleAccordion(gp.id)}
            elevation={0}
            sx={{
              mb: 1.5,
              border: '1px solid #e0e0e0',
              borderRadius: '8px !important',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { borderColor: NAVY }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                borderRadius: '8px',
                '&.Mui-expanded': { backgroundColor: '#f0f4f8' },
                px: 2.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: '100%', pr: 1 }}>
                <Chip
                  label={`L${gp.lesson_number}`}
                  size="small"
                  sx={{ backgroundColor: NAVY, color: 'white', fontWeight: 'bold', fontSize: '11px' }}
                />
                <Chip
                  label={gp.jlpt_level}
                  size="small"
                  sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '11px' }}
                />
                <Typography sx={{ fontWeight: 600, fontSize: '15px', color: NAVY }}>
                  {gp.pattern}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                  {gp.meaning}
                </Typography>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>

              {/* STRUCTURE */}
              <Box sx={{ backgroundColor: '#f8f9fa', borderLeft: `4px solid ${NAVY}`, px: 2, py: 1.5, borderRadius: '0 6px 6px 0', mb: 2.5 }}>
                <Typography variant="caption" sx={{ color: NAVY, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Structure
                </Typography>
                <Typography sx={{ fontSize: '14px', mt: 0.5, fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                  {gp.structure}
                </Typography>
              </Box>

              {/* EXPLANATION */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LightbulbIcon sx={{ fontSize: '16px', color: '#f57c00' }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#f57c00' }}>
                    Explanation
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '14px', whiteSpace: 'pre-line', lineHeight: 1.8, color: '#333' }}>
                  {gp.explanation}
                </Typography>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* EXAMPLE SENTENCES */}
              {examples.length > 0 && (
                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <MenuBookIcon sx={{ fontSize: '16px', color: NAVY }} />
                    <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: NAVY }}>
                      Example Sentences
                    </Typography>
                  </Box>
                  {examples.map((ex, idx) => (
                    <Box key={ex.id} sx={{ mb: 1.5, pl: 1 }}>
                      <Typography sx={{ fontSize: '15px', fontWeight: 500 }}>
                        {idx + 1}. {ex.japanese}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#888', mt: 0.25 }}>
                        {ex.reading}
                      </Typography>
                      <Typography sx={{ fontSize: '13px', color: '#555', mt: 0.25, fontStyle: 'italic' }}>
                        {ex.english}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              <Divider sx={{ mb: 2.5 }} />

              {/* EXERCISES */}
              {exercises.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <QuizIcon sx={{ fontSize: '16px', color: '#7b1fa2' }} />
                    <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7b1fa2' }}>
                      Practice Exercises
                    </Typography>
                  </Box>

                  {exercises.map((ex, idx) => {
                    const selected = gpAnswers[ex.id]
                    const isCorrect = selected === ex.correct_answer
                    const optionMap = { a: ex.option_a, b: ex.option_b, c: ex.option_c, d: ex.option_d }

                    return (
                      <Box key={ex.id} sx={{ mb: 3, p: 2, backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #eeeeee' }}>
                        <Typography sx={{ fontSize: '14px', fontWeight: 500, mb: 1.5 }}>
                          {idx + 1}. {ex.question}
                        </Typography>

                        <RadioGroup
                          value={selected || ''}
                          onChange={e => !isRevealed && handleAnswerSelect(gp.id, ex.id, e.target.value)}
                        >
                          {['a', 'b', 'c', 'd'].map(opt => {
                            let color = 'inherit'
                            let bgColor = 'transparent'
                            if (isRevealed) {
                              if (opt === ex.correct_answer) { color = '#2e7d32'; bgColor = '#e8f5e9' }
                              else if (opt === selected && opt !== ex.correct_answer) { color = '#c62828'; bgColor = '#ffebee' }
                            }
                            return (
                              <FormControlLabel
                                key={opt}
                                value={opt}
                                control={<Radio size="small" sx={{ color: isRevealed && opt === ex.correct_answer ? '#2e7d32' : undefined }} />}
                                label={<Typography sx={{ fontSize: '13px', color }}>{optionMap[opt]}</Typography>}
                                sx={{ mb: 0.5, px: 1, borderRadius: '6px', backgroundColor: bgColor, transition: 'background-color 0.2s' }}
                                disabled={isRevealed}
                              />
                            )
                          })}
                        </RadioGroup>

                        {isRevealed && (
                          <Alert
                            severity={isCorrect ? 'success' : 'error'}
                            sx={{ mt: 1.5, fontSize: '13px' }}
                          >
                            <strong>{isCorrect ? '✓ Correct!' : `✗ Incorrect. Correct answer: ${ex.correct_answer.toUpperCase()}`}</strong>
                            <br />
                            {ex.explanation}
                          </Alert>
                        )}
                      </Box>
                    )
                  })}

                  {/* SCORE + ACTIONS */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                    {isRevealed && (
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: correct === total ? '#2e7d32' : NAVY }}>
                        Score: {correct} / {total}
                      </Typography>
                    )}
                    {!isRevealed && (
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!allAnswered}
                        onClick={() => handleReveal(gp.id)}
                        sx={{ backgroundColor: NAVY, '&:hover': { backgroundColor: '#0f2744' }, textTransform: 'none', fontSize: '13px' }}
                      >
                        Check Answers
                      </Button>
                    )}
                    {isRevealed && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleReset(gp.id)}
                        sx={{ borderColor: NAVY, color: NAVY, textTransform: 'none', fontSize: '13px' }}
                      >
                        Try Again
                      </Button>
                    )}
                    {!isRevealed && !allAnswered && total > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Answer all {total} questions to check
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        )
      })}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3} mb={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            sx={{ '& .MuiPaginationItem-root.Mui-selected': { backgroundColor: NAVY } }}
          />
        </Box>
      )}
    </Box>
  )
}