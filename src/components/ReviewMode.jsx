import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Grid, Button, Chip,
  TextField, FormGroup, FormControlLabel, Checkbox,
  Select, FormControl, InputLabel, MenuItem,
  OutlinedInput, ListItemText, useMediaQuery, useTheme
} from '@mui/material'
import StyleIcon from '@mui/icons-material/Style'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import QuizIcon from '@mui/icons-material/Quiz'
import EditNoteIcon from '@mui/icons-material/EditNote'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import BookmarkIcon from '@mui/icons-material/Bookmark'
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
  const isDark = theme.palette.mode === 'dark'

  const [selectedMode, setSelectedMode] = useState(null)
  const [started, setStarted] = useState(false)
  const [cardCount, setCardCount] = useState(20)
  const [cardCountInput, setCardCountInput] = useState('20')
  const [cardCountError, setCardCountError] = useState('')

  const [jlptLevels, setJlptLevels] = useState([])
  const [books, setBooks] = useState([])
  const [filterBook, setFilterBook] = useState('')
  const [lessonFrom, setLessonFrom] = useState(null)
  const [lessonTo, setLessonTo] = useState(null)
  const [lessonOptions, setLessonOptions] = useState([])
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
  }

  useEffect(() => {
    if (filterBook) {
      fetchLessonsForBook(filterBook)
    } else {
      setLessonOptions([])
      setLessonFrom(null)
      setLessonTo(null)
    }
  }, [filterBook])

  async function fetchLessonsForBook(bookId) {
    const { data } = await supabase
      .from('vocabulary_books').select('lesson_number').eq('book_id', bookId)
      .order('lesson_number', { ascending: true })
    if (data) {
      const unique = [...new Set(data.map(d => d.lesson_number).filter(Boolean))]
      setLessonOptions(unique)
    }
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
    bookRanges: filterBook ? [{ bookId: Number(filterBook), from: lessonFrom, to: lessonTo }] : [],
    savedVocabIds: savedOnly ? [...savedIds] : null,
  }

  const startDisabled = !selectedMode
    || (!isReadingMode(selectedMode) && (cardCountError !== '' || !cardCountInput))
    || (selectedMode === 'conjugation' && selectedForms.length === 0)
    || (savedOnly && savedCount === 0)

  if (started && selectedMode === 'flashcard') return <FlashcardMode activeFilter={activeFilter} cardCount={cardCount} onBack={handleBack} userId={userId} />
  if (started && selectedMode === 'conjugation') return <ConjugationDrill activeFilter={activeFilter} cardCount={cardCount} selectedForms={selectedForms} onBack={handleBack} userId={userId} />
  if (started && selectedMode === 'multiple') return <MultipleChoice activeFilter={activeFilter} cardCount={cardCount} onBack={handleBack} userId={userId} />
  if (started && selectedMode === 'reading') return <ReadingMode activeFilter={activeFilter} onBack={handleBack} />

  function getFilterSummary() {
    if (savedOnly) return `Saved words (${savedCount})`
    const parts = []
    if (filterLevels.length > 0) parts.push(filterLevels.join(', '))
    if (filterBook) {
      const bookName = books.find(b => b.id === Number(filterBook))?.book_name || 'Book'
      const rangeStr = lessonFrom !== null && lessonTo !== null
        ? `L${lessonFrom}–${lessonTo}` : lessonFrom !== null ? `L${lessonFrom}+` : lessonTo !== null ? `up to L${lessonTo}` : ''
      parts.push(rangeStr ? `${bookName}: ${rangeStr}` : bookName)
    }
    return parts.length > 0 ? parts.join(' | ') : 'All words'
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {/* MODE SELECTION — horizontal scrollable chips */}
      <Typography variant="subtitle2" fontWeight="bold" mb={1}>復習モード</Typography>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1.5, '&::-webkit-scrollbar': { display: 'none' } }}>
        {MODES.map(mode => (
          <Card
            key={mode.id}
            onClick={() => mode.available && setSelectedMode(mode.id)}
            sx={{
              cursor: mode.available ? 'pointer' : 'not-allowed',
              border: selectedMode === mode.id ? '2px solid #1a3a5c' : '2px solid transparent',
              opacity: mode.available ? 1 : 0.4,
              minWidth: isMobile ? 80 : 100,
              flex: '0 0 auto',
              transition: 'all 0.15s',
              backgroundColor: selectedMode === mode.id ? (isDark ? 'rgba(26,58,92,0.2)' : 'rgba(26,58,92,0.05)') : undefined,
            }}
            elevation={selectedMode === mode.id ? 2 : 0}
            variant={selectedMode === mode.id ? 'elevation' : 'outlined'}
          >
            <CardContent sx={{ textAlign: 'center', py: 1, px: 1, '&:last-child': { pb: 1 } }}>
              <Box sx={{ color: selectedMode === mode.id ? '#1a3a5c' : 'text.disabled', '& svg': { fontSize: 22 } }}>
                {mode.icon}
              </Box>
              <Typography fontWeight={selectedMode === mode.id ? 700 : 500} fontSize="11px" mt={0.25} noWrap>
                {mode.label}
              </Typography>
              {!mode.available && (
                <Chip label="Soon" size="small" sx={{ height: 12, fontSize: '8px', mt: 0.25, '& .MuiChip-label': { px: 0.5 } }} />
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {selectedMode === 'conjugation' && formTypes.length > 0 && (
        <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography fontWeight="bold" fontSize="12px">Form Types</Typography>
              <Button size="small" onClick={toggleAll} sx={{ color: '#1a3a5c', textTransform: 'none', fontSize: '11px', minWidth: 0, p: 0 }}>
                {selectedForms.length === formTypes.length ? 'Uncheck All' : 'Check All'}
              </Button>
            </Box>
            <FormGroup row>
              {formTypes.map(form => (
                <FormControlLabel key={form}
                  control={<Checkbox checked={selectedForms.includes(form)} onChange={() => toggleForm(form)} size="small"
                    sx={{ color: '#1a3a5c', '&.Mui-checked': { color: '#1a3a5c' }, p: 0.25 }} />}
                  label={<Typography fontSize="11px">{form}</Typography>}
                  sx={{ width: '50%', mr: 0, mb: 0 }} />
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

      <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
        <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Typography fontWeight="bold" fontSize="12px">Filter Words</Typography>
            {userId && (
              <Chip
                icon={<BookmarkIcon sx={{ fontSize: '12px !important' }} />}
                label={savedCount > 0 ? `Saved (${savedCount})` : 'Saved'}
                size="small"
                onClick={() => savedCount > 0 && setSavedOnly(s => !s)}
                variant={savedOnly ? 'filled' : 'outlined'}
                sx={{
                  height: 22,
                  cursor: savedCount > 0 ? 'pointer' : 'default',
                  opacity: savedCount > 0 ? 1 : 0.4,
                  backgroundColor: savedOnly ? '#1a3a5c' : 'transparent',
                  color: savedOnly ? 'white' : '#1a3a5c',
                  borderColor: '#1a3a5c',
                  fontSize: '10px',
                  '& .MuiChip-icon': { color: savedOnly ? 'white' : '#1a3a5c' },
                }}
              />
            )}
          </Box>

          {!savedOnly && (
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel shrink sx={{ fontSize: '12px' }}>JLPT</InputLabel>
                  <Select multiple value={filterLevels} onChange={e => setFilterLevels(e.target.value)}
                    input={<OutlinedInput notched label="JLPT" />}
                    renderValue={selected => selected.length === 0 ? 'All' : selected.join(', ')}
                    displayEmpty sx={{ height: 34, fontSize: '12px' }}>
                    {jlptLevels.map(l => (
                      <MenuItem key={l.id} value={l.level} dense>
                        <Checkbox checked={filterLevels.includes(l.level)} size="small"
                          sx={{ color: '#1a3a5c', '&.Mui-checked': { color: '#1a3a5c' }, p: 0.25 }} />
                        <ListItemText primary={l.level} primaryTypographyProps={{ fontSize: '13px' }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth select label="Book" value={filterBook}
                  onChange={e => { setFilterBook(e.target.value); setLessonFrom(null); setLessonTo(null) }}
                  size="small" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiInputBase-root': { height: 34, fontSize: '12px' } }}>
                  <MenuItem value="" dense><Typography fontSize="12px">All Books</Typography></MenuItem>
                  {books.map(b => <MenuItem key={b.id} value={b.id} dense><Typography fontSize="12px">{b.book_name}</Typography></MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={5}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <TextField select label="From" value={lessonFrom ?? ''} disabled={!filterBook}
                    onChange={e => setLessonFrom(e.target.value === '' ? null : Number(e.target.value))}
                    size="small" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, '& .MuiInputBase-root': { height: 34, fontSize: '11px' } }}>
                    <MenuItem value="" dense><Typography fontSize="11px">–</Typography></MenuItem>
                    {lessonOptions.map(l => <MenuItem key={l} value={l} dense><Typography fontSize="11px">L{l}</Typography></MenuItem>)}
                  </TextField>
                  <TextField select label="To" value={lessonTo ?? ''} disabled={!filterBook}
                    onChange={e => setLessonTo(e.target.value === '' ? null : Number(e.target.value))}
                    size="small" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, '& .MuiInputBase-root': { height: 34, fontSize: '11px' } }}>
                    <MenuItem value="" dense><Typography fontSize="11px">–</Typography></MenuItem>
                    {lessonOptions.filter(l => lessonFrom === null || l >= lessonFrom).map(l => <MenuItem key={l} value={l} dense><Typography fontSize="11px">L{l}</Typography></MenuItem>)}
                  </TextField>
                </Box>
              </Grid>
            </Grid>
          )}

          <Typography fontSize="10px" color="text.secondary" mt={0.75} display="block">
            Reviewing: <strong>{getFilterSummary()}</strong>
          </Typography>
        </CardContent>
      </Card>

      {/* CARD COUNT + START */}
      {!isReadingMode(selectedMode) && (
        <Card sx={{ mb: 1.5 }} elevation={0} variant="outlined">
          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
            <Typography fontWeight="bold" fontSize="12px" mb={0.75}>Cards</Typography>
            <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
              {[10, 20, 30, 50, 100].map(n => (
                <Chip key={n} label={n} size="small"
                  onClick={() => { setCardCountInput(String(n)); setCardCount(n); setCardCountError('') }}
                  variant={cardCount === n && !cardCountError ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    height: 24,
                    fontSize: '11px',
                    backgroundColor: cardCount === n && !cardCountError ? '#1a3a5c' : 'transparent',
                    color: cardCount === n && !cardCountError ? 'white' : '#1a3a5c',
                    borderColor: '#1a3a5c',
                  }} />
              ))}
              <TextField value={cardCountInput} onChange={e => handleCardCountChange(e.target.value)}
                size="small" type="number" inputProps={{ min: 1, max: 200 }}
                error={!!cardCountError}
                sx={{ width: 70, '& .MuiInputBase-root': { height: 28, fontSize: '12px' } }} />
            </Box>
            {cardCountError && <Typography fontSize="10px" color="error" mt={0.5}>{cardCountError}</Typography>}
          </CardContent>
        </Card>
      )}

      <Button fullWidth variant="contained" disabled={startDisabled} onClick={handleStart}
        sx={{ backgroundColor: '#1a3a5c', py: 1, fontSize: '13px', fontWeight: 600, borderRadius: 2 }}>
        Start Review
      </Button>
    </Box>
  )
}

export default ReviewMode