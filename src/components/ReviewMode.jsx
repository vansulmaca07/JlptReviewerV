import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Grid, Button, Chip,
  TextField, FormGroup, FormControlLabel, Checkbox, Divider,
  InputAdornment, Autocomplete, Select, FormControl, InputLabel,
  OutlinedInput, ListItemText, useMediaQuery, useTheme
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'
import StyleIcon from '@mui/icons-material/Style'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import QuizIcon from '@mui/icons-material/Quiz'
import EditNoteIcon from '@mui/icons-material/EditNote'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import MenuItem from '@mui/material/MenuItem'
import FlashcardMode from './FlashcardMode'
import ConjugationDrill from './ConjugationDrill'
import MultipleChoice from './MultipleChoice'
import ReadingMode from './ReadingMode'
import { supabase } from '../supabaseClient'
import { getSavedWordIds } from '../utils/savedWordsUtils'

const MODES = [
  { id: 'flashcard', label: 'Flashcard', icon: <StyleIcon />, description: 'JP → EN flip cards', available: true },
  { id: 'conjugation', label: 'Conjugation', icon: <FitnessCenterIcon />, description: 'Test verb conjugations', available: true },
  { id: 'multiple', label: 'Multiple Choice', icon: <QuizIcon />, description: 'Pick the correct answer', available: true },
  { id: 'reading', label: '読解', icon: <MenuBookIcon />, description: 'Reading comprehension', available: true },
  { id: 'fillin', label: 'Fill in Blank', icon: <EditNoteIcon />, description: 'Complete the sentence', available: false },
]

const isReadingMode = (mode) => mode === 'reading'

function ReviewMode({ userId = null }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [selectedMode, setSelectedMode] = useState(null)
  const [started, setStarted] = useState(false)
  const [cardCount, setCardCount] = useState(20)
  const [cardCountInput, setCardCountInput] = useState('20')
  const [cardCountError, setCardCountError] = useState('')

  const [jlptLevels, setJlptLevels] = useState([])
  const [books, setBooks] = useState([])
  const [visibleBooks, setVisibleBooks] = useState([])
  const [bookLessonRanges, setBookLessonRanges] = useState({})
  const [filterLevels, setFilterLevels] = useState([])
  const [formTypes, setFormTypes] = useState([])
  const [selectedForms, setSelectedForms] = useState([])

  const [savedOnly, setSavedOnly] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => { fetchReferenceData() }, [])

  useEffect(() => {
    if (userId) {
      getSavedWordIds(userId).then(ids => {
        setSavedIds(ids)
        setSavedCount(ids.size)
      })
    }
  }, [userId])

  async function fetchReferenceData() {
    const [{ data: levels }, { data: booksData }] = await Promise.all([
      supabase.from('jlpt_levels').select('*').order('id'),
      supabase.from('books').select('*, jlpt_levels(level)').order('id'),
    ])
    setJlptLevels(levels || [])
    setBooks(booksData || [])
    setVisibleBooks(booksData || [])
  }

  useEffect(() => {
    const visible = filterLevels.length === 0
      ? books
      : books.filter(b => filterLevels.includes(b.jlpt_levels?.level))
    setVisibleBooks(visible)
    setBookLessonRanges({})
  }, [filterLevels, books])

  useEffect(() => {
    visibleBooks.forEach(book => {
      setBookLessonRanges(prev => {
        if (prev[book.id]?.lessons) return prev
        fetchLessonsForBook(book.id)
        return prev
      })
    })
  }, [visibleBooks])

  async function fetchLessonsForBook(bookId) {
    const { data } = await supabase
      .from('vocabulary').select('lesson_number').eq('book_id', bookId)
      .order('lesson_number', { ascending: true })
    if (data) {
      const unique = [...new Set(data.map(d => d.lesson_number).filter(Boolean))]
      setBookLessonRanges(prev => ({
        ...prev,
        [bookId]: { from: null, to: null, lessons: unique, ...(prev[bookId] || {}) }
      }))
    }
  }

  function setBookRange(bookId, field, value) {
    setBookLessonRanges(prev => ({ ...prev, [bookId]: { ...prev[bookId], [field]: value } }))
  }

  function clearBookRange(bookId) {
    setBookLessonRanges(prev => ({ ...prev, [bookId]: { ...prev[bookId], from: null, to: null } }))
  }

  useEffect(() => {
    if (selectedMode === 'conjugation') fetchFormTypes()
    else { setFormTypes([]); setSelectedForms([]) }
  }, [selectedMode])

  async function fetchFormTypes() {
    const { data } = await supabase.from('conjugations').select('form_type')
    if (data) {
      const unique = [...new Set(data.map(d => d.form_type))].sort()
      setFormTypes(unique)
      setSelectedForms(unique)
    }
  }

  function toggleForm(form) {
    setSelectedForms(prev => prev.includes(form) ? prev.filter(f => f !== form) : [...prev, form])
  }
  function toggleAll() {
    setSelectedForms(prev => prev.length === formTypes.length ? [] : [...formTypes])
  }

  function handleCardCountChange(val) {
    setCardCountInput(val)
    const num = parseInt(val)
    if (!val || isNaN(num) || num < 1) { setCardCountError('Enter a number between 1 and 200'); return }
    if (num > 200) { setCardCountError('Maximum is 200'); return }
    setCardCountError('')
    setCardCount(num)
  }

  function handleStart() {
    if (!selectedMode) return
    setStarted(true)
  }

  function handleBack() {
    setStarted(false)
    setSelectedMode(null)
  }

  const activeFilter = {
    levels: filterLevels,
    bookRanges: visibleBooks.map(b => ({
      bookId: b.id,
      from: bookLessonRanges[b.id]?.from ?? null,
      to: bookLessonRanges[b.id]?.to ?? null,
    })),
    savedVocabIds: savedOnly ? [...savedIds] : null,
  }

  const startDisabled = !selectedMode
    || (!isReadingMode(selectedMode) && (cardCountError !== '' || !cardCountInput))
    || (selectedMode === 'conjugation' && selectedForms.length === 0)
    || (savedOnly && savedCount === 0)

  if (started && selectedMode === 'flashcard') return <FlashcardMode activeFilter={activeFilter} cardCount={cardCount} onBack={handleBack} userId={userId} />
  if (started && selectedMode === 'conjugation') return <ConjugationDrill activeFilter={activeFilter} cardCount={cardCount} selectedForms={selectedForms} onBack={handleBack} />
  if (started && selectedMode === 'multiple') return <MultipleChoice activeFilter={activeFilter} cardCount={cardCount} onBack={handleBack} userId={userId} />
  if (started && selectedMode === 'reading') return <ReadingMode activeFilter={activeFilter} onBack={handleBack} />

  function getFilterSummary() {
    if (savedOnly) return `🔖 Saved words (${savedCount})`
    const parts = []
    if (filterLevels.length > 0) parts.push(filterLevels.join(', '))
    const hasRanges = Object.values(bookLessonRanges).some(r => r.from !== null || r.to !== null)
    if (hasRanges) {
      visibleBooks.forEach(b => {
        const r = bookLessonRanges[b.id]
        if (!r || (r.from === null && r.to === null)) return
        const rangeStr = r.from !== null && r.to !== null
          ? `L${r.from}–${r.to}` : r.from !== null ? `L${r.from}+` : `up to L${r.to}`
        parts.push(`${b.book_name}: ${rangeStr}`)
      })
    }
    return parts.length > 0 ? parts.join(' | ') : 'All words'
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" mb={0.5}>復習モード</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>Choose a review mode to start studying!</Typography>

      <Grid container spacing={isMobile ? 1 : 2} mb={2}>
        {MODES.map(mode => (
          <Grid item xs={6} key={mode.id}>
            <Card
              onClick={() => mode.available && setSelectedMode(mode.id)}
              sx={{
                cursor: mode.available ? 'pointer' : 'not-allowed',
                border: selectedMode === mode.id ? '2px solid #1a3a5c' : '2px solid transparent',
                opacity: mode.available ? 1 : 0.45,
                transition: 'all 0.2s',
                '&:hover': mode.available ? { boxShadow: 4, transform: 'translateY(-2px)' } : {}
              }}>
              <CardContent sx={{ textAlign: 'center', py: isMobile ? 1.5 : 3, px: isMobile ? 1 : 2, '&:last-child': { pb: isMobile ? 1.5 : 3 } }}>
                <Box sx={{ color: selectedMode === mode.id ? '#1a3a5c' : 'text.secondary', mb: 0.5, '& svg': { fontSize: isMobile ? 28 : 40 } }}>
                  {mode.icon}
                </Box>
                <Typography fontWeight="bold" variant={isMobile ? 'caption' : 'body1'} display="block">
                  {mode.label}
                </Typography>
                {!isMobile && (
                  <Typography variant="caption" color="text.secondary">{mode.description}</Typography>
                )}
                {!mode.available && (
                  <Chip label="Soon" size="small" sx={{ mt: 0.5, height: 16, fontSize: '10px' }} />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedMode === 'conjugation' && formTypes.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography fontWeight="bold" variant={isMobile ? 'body2' : 'body1'}>📝 Form Types</Typography>
              <Button size="small" onClick={toggleAll} sx={{ color: '#1a3a5c', textTransform: 'none', fontSize: isMobile ? '11px' : '13px' }}>
                {selectedForms.length === formTypes.length ? 'Uncheck All' : 'Check All'}
              </Button>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <FormGroup row>
              {formTypes.map(form => (
                <FormControlLabel key={form}
                  control={<Checkbox checked={selectedForms.includes(form)} onChange={() => toggleForm(form)} size="small"
                    sx={{ color: '#1a3a5c', '&.Mui-checked': { color: '#1a3a5c' }, py: 0.5 }} />}
                  label={<Typography variant="caption">{form}</Typography>}
                  sx={{ width: '50%', mr: 0 }} />
              ))}
            </FormGroup>
            {selectedForms.length === 0 && (
              <Typography variant="caption" color="error" mt={1} display="block">
                Please select at least one form type!
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography fontWeight="bold" variant={isMobile ? 'body2' : 'body1'}>📚 Filter Words</Typography>
            {userId && (
              <Chip
                icon={<BookmarkIcon sx={{ fontSize: '14px !important' }} />}
                label={savedCount > 0 ? `Saved (${savedCount})` : 'Saved'}
                size="small"
                onClick={() => savedCount > 0 && setSavedOnly(s => !s)}
                variant={savedOnly ? 'filled' : 'outlined'}
                sx={{
                  cursor: savedCount > 0 ? 'pointer' : 'default',
                  opacity: savedCount > 0 ? 1 : 0.4,
                  backgroundColor: savedOnly ? '#1a3a5c' : 'transparent',
                  color: savedOnly ? 'white' : '#1a3a5c',
                  borderColor: '#1a3a5c',
                  '& .MuiChip-icon': { color: savedOnly ? 'white' : '#1a3a5c' },
                }}
              />
            )}
          </Box>

          {/* Hide level/lesson filters when savedOnly is on */}
          {!savedOnly && (
            <Grid container spacing={1.5} alignItems="flex-start">
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth size="small">
                  <InputLabel shrink>JLPT Level</InputLabel>
                  <Select multiple value={filterLevels} onChange={e => setFilterLevels(e.target.value)}
                    input={<OutlinedInput notched label="JLPT Level" />}
                    renderValue={selected => selected.length === 0 ? 'All Levels' : selected.join(', ')}
                    displayEmpty>
                    {jlptLevels.map(l => (
                      <MenuItem key={l.id} value={l.level}>
                        <Checkbox checked={filterLevels.includes(l.level)} size="small"
                          sx={{ color: '#1a3a5c', '&.Mui-checked': { color: '#1a3a5c' } }} />
                        <ListItemText primary={l.level} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {visibleBooks.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
                    LESSON RANGE (per book)
                  </Typography>
                  <Grid container spacing={1}>
                    {visibleBooks.map(book => {
                      const range = bookLessonRanges[book.id] || { from: null, to: null, lessons: [] }
                      return (
                        <Grid item xs={12} key={book.id}>
                          <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 1, p: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <MenuBookIcon sx={{ fontSize: 13, color: '#1a3a5c' }} />
                              <Typography variant="caption" fontWeight="bold" color="#1a3a5c">{book.book_name}</Typography>
                              <Chip label={book.jlpt_levels?.level} size="small" color="primary" sx={{ height: 16, fontSize: '10px' }} />
                            </Box>
                            <Grid container spacing={1} alignItems="center">
                              <Grid item xs={isMobile ? 5.5 : 5}>
                                <Autocomplete options={range.lessons || []} getOptionLabel={l => `L${l}`}
                                  value={range.from} onChange={(_, val) => setBookRange(book.id, 'from', val)} size="small"
                                  renderInput={params => <TextField {...params} label="From" size="small" InputLabelProps={{ shrink: true }} />} />
                              </Grid>
                              <Grid item xs={1} textAlign="center">
                                <Typography variant="body2" color="text.disabled">—</Typography>
                              </Grid>
                              <Grid item xs={isMobile ? 5.5 : 5}>
                                <Autocomplete
                                  options={(range.lessons || []).filter(l => range.from === null || l >= range.from)}
                                  getOptionLabel={l => `L${l}`} value={range.to}
                                  onChange={(_, val) => setBookRange(book.id, 'to', val)} size="small"
                                  renderInput={params => <TextField {...params} label="To" size="small" InputLabelProps={{ shrink: true }} />} />
                              </Grid>
                              {!isMobile && (
                                <Grid item xs={1}>
                                  {(range.from !== null || range.to !== null) && (
                                    <IconButton size="small" onClick={() => clearBookRange(book.id)} sx={{ color: 'text.disabled' }}>
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Grid>
                              )}
                            </Grid>
                            {isMobile && (range.from !== null || range.to !== null) && (
                              <Box display="flex" justifyContent="flex-end" mt={0.5}>
                                <Button size="small" onClick={() => clearBookRange(book.id)}
                                  sx={{ color: 'text.disabled', textTransform: 'none', fontSize: '11px', minWidth: 0, p: 0 }}>
                                  Clear
                                </Button>
                              </Box>
                            )}
                            {(range.from !== null || range.to !== null) && (
                              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                                📖 {range.from !== null && range.to !== null
                                  ? `Lessons ${range.from} – ${range.to}`
                                  : range.from !== null ? `From Lesson ${range.from}` : `Up to Lesson ${range.to}`}
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}

          <Typography variant="caption" color="text.secondary" mt={savedOnly ? 0 : 1.5} display="block">
            📖 Reviewing: <strong>{getFilterSummary()}</strong>
          </Typography>
        </CardContent>
      </Card>

      {!isReadingMode(selectedMode) && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
            <Typography fontWeight="bold" variant={isMobile ? 'body2' : 'body1'} mb={1.5}>🎴 Number of Cards</Typography>
            <TextField value={cardCountInput} onChange={e => handleCardCountChange(e.target.value)}
              size="small" type="number" inputProps={{ min: 1, max: 200 }}
              error={!!cardCountError} helperText={cardCountError || 'Cards to review (1–200)'}
              InputProps={{ endAdornment: <InputAdornment position="end">cards</InputAdornment> }}
              sx={{ width: isMobile ? 150 : 180 }} />
            <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
              {[10, 20, 30, 50, 100].map(n => (
                <Chip key={n} label={n} size="small"
                  onClick={() => { setCardCountInput(String(n)); setCardCount(n); setCardCountError('') }}
                  variant={cardCount === n && !cardCountError ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: cardCount === n && !cardCountError ? '#1a3a5c' : 'transparent',
                    color: cardCount === n && !cardCountError ? 'white' : '#1a3a5c',
                    borderColor: '#1a3a5c',
                  }} />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Button fullWidth variant="contained" size="large" disabled={startDisabled} onClick={handleStart}
        sx={{ backgroundColor: '#1a3a5c', py: isMobile ? 1.2 : 1.5, fontSize: isMobile ? '14px' : '16px' }}>
        🚀 Start Review
      </Button>
    </Box>
  )
}

export default ReviewMode