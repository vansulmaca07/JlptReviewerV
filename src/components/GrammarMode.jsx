import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  Box, Typography, Chip, CircularProgress, Accordion, AccordionSummary,
  AccordionDetails, Divider, Button, FormControl, InputLabel, Select,
  MenuItem, RadioGroup, FormControlLabel, Radio, Alert, Pagination,
  Card, CardContent, Grid, Autocomplete, TextField, OutlinedInput,
  useTheme, useMediaQuery
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import QuizIcon from '@mui/icons-material/Quiz'

const NAVY = '#1a3a5c'
const PAGE_SIZE = 20

export default function GrammarMode() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const subduedBg = isDark ? '#2a2a2a' : '#f8fafc'
  const structureBg = isDark ? '#1e2a1e' : '#f8f9fa'
  const structureBorder = NAVY
  const exerciseBg = isDark ? '#2a2a2a' : '#fafafa'
  const exerciseBorder = isDark ? '#3a3a3a' : '#eeeeee'

  const [grammarPoints, setGrammarPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(1)

  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState('')
  const [jlptLevel, setJlptLevel] = useState('all')
  const [lessonOptions, setLessonOptions] = useState([])
  const [lessonFrom, setLessonFrom] = useState(null)
  const [lessonTo, setLessonTo] = useState(null)

  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})

  useEffect(() => {
    fetchBooks()
  }, [])

  async function fetchBooks() {
    const { data } = await supabase.from('books').select('*, jlpt_levels(level)').order('id')
    setBooks(data || [])
  }

  useEffect(() => {
    if (selectedBook) fetchLessonsForBook()
    else setLessonOptions([])
  }, [selectedBook])

  async function fetchLessonsForBook() {
    const bookData = books.find(b => String(b.id) === String(selectedBook))
    if (!bookData) return
    const { data } = await supabase
      .from('grammar_points')
      .select('lesson_number')
      .eq('book', bookData.book_name.includes('II') || bookData.book_name.includes('2') ? 2 : 1)
      .order('lesson_number', { ascending: true })
    if (data) {
      const unique = [...new Set(data.map(d => d.lesson_number).filter(Boolean))]
      setLessonOptions(unique)
    }
  }

  useEffect(() => {
    fetchGrammarPoints()
  }, [selectedBook, jlptLevel, lessonFrom, lessonTo, books])

  async function fetchGrammarPoints() {
    setLoading(true)
    setExpanded(null)
    setAnswers({})
    setRevealed({})
    setPage(1)

    let query = supabase
      .from('grammar_points')
      .select(`*, grammar_examples ( * ), grammar_exercises ( * )`)
      .order('lesson_number', { ascending: true })
      .order('order_in_lesson', { ascending: true })

    if (selectedBook) {
      const bookData = books.find(b => String(b.id) === String(selectedBook))
      if (bookData) {
        const bookNum = bookData.book_name.includes('II') || bookData.book_name.includes('2') ? 2 : 1
        query = query.eq('book', bookNum)
      }
    }

    if (jlptLevel !== 'all') query = query.eq('jlpt_level', jlptLevel)
    if (lessonFrom !== null) query = query.gte('lesson_number', lessonFrom)
    if (lessonTo !== null) query = query.lte('lesson_number', lessonTo)

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

  const totalPages = Math.ceil(grammarPoints.length / PAGE_SIZE)
  const paginated = grammarPoints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const rangeStart = grammarPoints.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, grammarPoints.length)

  return (
    <Box>
      {/* FILTERS */}
      <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
        <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel shrink sx={{ fontSize: '12px' }}>Book</InputLabel>
                <Select value={selectedBook} displayEmpty
                  onChange={e => { setSelectedBook(e.target.value); setLessonFrom(null); setLessonTo(null) }}
                  input={<OutlinedInput notched label="Book" />}
                  sx={{ height: 34, fontSize: '12px' }}>
                  <MenuItem value="" dense><Typography fontSize="12px">All Books</Typography></MenuItem>
                  {books.map(b => (
                    <MenuItem key={b.id} value={b.id} dense>
                      <Typography fontSize="12px">{b.book_name}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel shrink sx={{ fontSize: '12px' }}>JLPT</InputLabel>
                <Select value={jlptLevel}
                  onChange={e => setJlptLevel(e.target.value)}
                  input={<OutlinedInput notched label="JLPT" />}
                  sx={{ height: 34, fontSize: '12px' }}>
                  <MenuItem value="all" dense><Typography fontSize="12px">All Levels</Typography></MenuItem>
                  <MenuItem value="N5" dense><Typography fontSize="12px">N5</Typography></MenuItem>
                  <MenuItem value="N4" dense><Typography fontSize="12px">N4</Typography></MenuItem>
                  <MenuItem value="N3" dense><Typography fontSize="12px">N3</Typography></MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {selectedBook && lessonOptions.length > 0 && (
              <>
                <Grid item xs={5}>
                  <Autocomplete options={lessonOptions} getOptionLabel={l => `L${l}`}
                    value={lessonFrom} onChange={(_, val) => { setLessonFrom(val); setPage(1) }} size="small"
                    renderInput={params => <TextField {...params} label="From" size="small" InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiInputBase-root': { height: 30, fontSize: '11px' } }} />} />
                </Grid>
                <Grid item xs={2} textAlign="center">
                  <Typography variant="caption" color="text.disabled">—</Typography>
                </Grid>
                <Grid item xs={5}>
                  <Autocomplete
                    options={lessonOptions.filter(l => lessonFrom === null || l >= lessonFrom)}
                    getOptionLabel={l => `L${l}`}
                    value={lessonTo} onChange={(_, val) => { setLessonTo(val); setPage(1) }} size="small"
                    renderInput={params => <TextField {...params} label="To" size="small" InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiInputBase-root': { height: 30, fontSize: '11px' } }} />} />
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* RESULTS COUNT */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {grammarPoints.length === 0
          ? 'No grammar points found'
          : `${rangeStart}–${rangeEnd} of ${grammarPoints.length} grammar points`
        }
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress sx={{ color: NAVY }} />
        </Box>
      )}

      {!loading && grammarPoints.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 6, color: 'text.secondary' }}>
          <Typography>No grammar points found for the selected filters.</Typography>
        </Box>
      )}

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
              border: '1px solid',
              borderColor: expanded === gp.id ? NAVY : 'divider',
              borderRadius: '8px !important',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                borderRadius: '8px',
                '&.Mui-expanded': { backgroundColor: isDark ? '#1a2a3a' : '#f0f4f8' },
                px: 2.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: '100%', pr: 1 }}>
                <Chip label={`L${gp.lesson_number}`} size="small"
                  sx={{ backgroundColor: NAVY, color: 'white', fontWeight: 'bold', fontSize: '11px' }} />
                <Chip label={gp.jlpt_level} size="small"
                  sx={{ backgroundColor: isDark ? '#1a3d1a' : '#e8f5e9', color: isDark ? '#81c784' : '#2e7d32', fontSize: '11px' }} />
                <Typography sx={{ fontWeight: 600, fontSize: '15px', color: NAVY }}>{gp.pattern}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>{gp.meaning}</Typography>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>

              {/* STRUCTURE */}
              <Box sx={{ backgroundColor: structureBg, borderLeft: `4px solid ${structureBorder}`, px: 2, py: 1.5, borderRadius: '0 6px 6px 0', mb: 2.5 }}>
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
                <Typography sx={{ fontSize: '14px', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
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
                      <Typography sx={{ fontSize: '15px', fontWeight: 500 }}>{idx + 1}. {ex.japanese}</Typography>
                      <Typography sx={{ fontSize: '12px', color: 'text.disabled', mt: 0.25 }}>{ex.reading}</Typography>
                      <Typography sx={{ fontSize: '13px', color: 'text.secondary', mt: 0.25, fontStyle: 'italic' }}>{ex.english}</Typography>
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
                      <Box key={ex.id} sx={{ mb: 3, p: 2, backgroundColor: exerciseBg, borderRadius: '8px', border: `1px solid ${exerciseBorder}` }}>
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
                              if (opt === ex.correct_answer) { color = '#2e7d32'; bgColor = isDark ? '#1a3d1a' : '#e8f5e9' }
                              else if (opt === selected && opt !== ex.correct_answer) { color = '#c62828'; bgColor = isDark ? '#3d1a1a' : '#ffebee' }
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
                          <Alert severity={isCorrect ? 'success' : 'error'} sx={{ mt: 1.5, fontSize: '13px' }}>
                            <strong>{isCorrect ? '✓ Correct!' : `✗ Incorrect. Correct answer: ${ex.correct_answer.toUpperCase()}`}</strong>
                            <br />{ex.explanation}
                          </Alert>
                        )}
                      </Box>
                    )
                  })}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                    {isRevealed && (
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: correct === total ? '#2e7d32' : NAVY }}>
                        Score: {correct} / {total}
                      </Typography>
                    )}
                    {!isRevealed && (
                      <Button variant="contained" size="small" disabled={!allAnswered} onClick={() => handleReveal(gp.id)}
                        sx={{ backgroundColor: NAVY, '&:hover': { backgroundColor: '#0f2744' }, textTransform: 'none', fontSize: '13px' }}>
                        Check Answers
                      </Button>
                    )}
                    {isRevealed && (
                      <Button variant="outlined" size="small" onClick={() => handleReset(gp.id)}
                        sx={{ borderColor: NAVY, color: NAVY, textTransform: 'none', fontSize: '13px' }}>
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

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3} mb={2}>
          <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary"
            sx={{ '& .MuiPaginationItem-root.Mui-selected': { backgroundColor: NAVY } }} />
        </Box>
      )}
    </Box>
  )
}