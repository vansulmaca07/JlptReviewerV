import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress,
  TextField, MenuItem, Button, IconButton, Divider, Grid,
  Pagination, InputAdornment, Tooltip, Autocomplete,
  Checkbox, ListItemText, Select, FormControl, InputLabel, OutlinedInput,
  useMediaQuery, useTheme
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import { getSavedWordIds, toggleSavedWord } from '../utils/savedWordsUtils'

const PAGE_SIZE = 20

function speak(text) {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  window.speechSynthesis.speak(utterance)
}

function VocabList({ isAdmin, userId = null }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [vocab, setVocab] = useState([])
  const [loading, setLoading] = useState(true)
  const [wordTypes, setWordTypes] = useState([])
  const [jlptLevels, setJlptLevels] = useState([])
  const [books, setBooks] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [filterLevels, setFilterLevels] = useState([])
  const [visibleBooks, setVisibleBooks] = useState([])
  const [bookLessonRanges, setBookLessonRanges] = useState({})
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingIds, setSavingIds] = useState(new Set())

  // Per-card English visibility — stores IDs of cards where English is SHOWN
  const [revealedIds, setRevealedIds] = useState(new Set())

  function toggleReveal(wordId) {
    setRevealedIds(prev => {
      const next = new Set(prev)
      next.has(wordId) ? next.delete(wordId) : next.add(wordId)
      return next
    })
  }

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: vocabData }, { data: types }, { data: levels }, { data: booksData }] = await Promise.all([
      supabase.from('vocabulary')
        .select(`*, word_types(type_name), jlpt_levels(level), books(id, book_name), example_sentences(*), conjugations(*)`)
        .order('lesson_number', { ascending: true }),
      supabase.from('word_types').select('*'),
      supabase.from('jlpt_levels').select('*').order('id'),
      supabase.from('books').select('*, jlpt_levels(level)').order('id'),
    ])
    setVocab(vocabData || [])
    setWordTypes(types || [])
    setJlptLevels(levels || [])
    setBooks(booksData || [])
    setLoading(false)

    if (userId) {
      const saved = await getSavedWordIds(userId)
      setSavedIds(saved)
    }
  }

  useEffect(() => {
    const visible = filterLevels.length === 0
      ? books : books.filter(b => filterLevels.includes(b.jlpt_levels?.level))
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
    const { data } = await supabase.from('vocabulary').select('lesson_number').eq('book_id', bookId)
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
    setPage(1)
  }

  function clearBookRange(bookId) {
    setBookLessonRanges(prev => ({ ...prev, [bookId]: { ...prev[bookId], from: null, to: null } }))
    setPage(1)
  }

  const filtered = vocab.filter(w => {
    const matchSearch = search.trim() === '' ||
      w.word.includes(search) || w.reading?.includes(search) ||
      w.meaning.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === '' || w.word_types?.type_name === filterType
    let matchScope = true
    if (filterLevels.length > 0) matchScope = filterLevels.includes(w.jlpt_levels?.level)
    if (matchScope && w.book_id && bookLessonRanges[w.book_id]) {
      const range = bookLessonRanges[w.book_id]
      if (range.from !== null) matchScope = matchScope && w.lesson_number >= range.from
      if (range.to !== null) matchScope = matchScope && w.lesson_number <= range.to
    }
    return matchSearch && matchType && matchScope && (!showSavedOnly || savedIds.has(w.id))
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function startEdit(word) {
    setEditingId(word.id)
    setEditData({
      word: word.word, reading: word.reading || '', meaning: word.meaning,
      word_type_id: word.word_type_id || '', jlpt_level_id: word.jlpt_level_id || '',
      lesson_number: word.lesson_number || '', book_id: word.book_id || '',
      examples: word.example_sentences.length > 0
        ? word.example_sentences.map(e => ({ id: e.id, japanese_sentence: e.japanese_sentence, english_translation: e.english_translation }))
        : [{ japanese_sentence: '', english_translation: '' }],
      conjugations: word.conjugations.length > 0
        ? word.conjugations.map(c => ({ id: c.id, form_type: c.form_type, conjugated_word: c.conjugated_word }))
        : [{ form_type: '', conjugated_word: '' }]
    })
  }

  function cancelEdit() { setEditingId(null); setEditData(null) }
  function addExample() { setEditData(d => ({ ...d, examples: [...d.examples, { japanese_sentence: '', english_translation: '' }] })) }
  function updateExample(i, field, value) { setEditData(d => { const u = [...d.examples]; u[i][field] = value; return { ...d, examples: u } }) }
  function removeExample(i) { setEditData(d => ({ ...d, examples: d.examples.filter((_, idx) => idx !== i) })) }
  function addConjugation() { setEditData(d => ({ ...d, conjugations: [...d.conjugations, { form_type: '', conjugated_word: '' }] })) }
  function updateConjugation(i, field, value) { setEditData(d => { const u = [...d.conjugations]; u[i][field] = value; return { ...d, conjugations: u } }) }
  function removeConjugation(i) { setEditData(d => ({ ...d, conjugations: d.conjugations.filter((_, idx) => idx !== i) })) }

  async function handleSave(vocabId) {
    setSaving(true)
    try {
      const { error: vocabError } = await supabase.from('vocabulary').update({
        word: editData.word, reading: editData.reading, meaning: editData.meaning,
        word_type_id: editData.word_type_id || null, jlpt_level_id: editData.jlpt_level_id || null,
        lesson_number: editData.lesson_number || null, book_id: editData.book_id || null,
      }).eq('id', vocabId)
      if (vocabError) throw vocabError
      await supabase.from('example_sentences').delete().eq('vocab_id', vocabId)
      const validExamples = editData.examples.filter(e => e.japanese_sentence.trim())
      if (validExamples.length > 0) {
        await supabase.from('example_sentences').insert(
          validExamples.map(e => ({ vocab_id: vocabId, japanese_sentence: e.japanese_sentence, english_translation: e.english_translation }))
        )
      }
      await supabase.from('conjugations').delete().eq('vocab_id', vocabId)
      const validConj = editData.conjugations.filter(c => c.conjugated_word.trim())
      if (validConj.length > 0) {
        await supabase.from('conjugations').insert(
          validConj.map(c => ({ vocab_id: vocabId, form_type: c.form_type, conjugated_word: c.conjugated_word }))
        )
      }
      await fetchAll(); cancelEdit()
    } catch (err) { console.error(err); alert('Error saving! Check console.') }
    setSaving(false)
  }

  async function handleDelete(vocabId) {
    if (!confirm('Delete this word?')) return
    await supabase.from('vocabulary').delete().eq('id', vocabId)
    await fetchAll()
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

  if (loading) return <Box textAlign="center" mt={10}><CircularProgress /></Box>

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>

      {/* FILTERS */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid item xs={12}>
              <TextField fullWidth size="small" placeholder="Search word, reading, or meaning..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel shrink>JLPT Level</InputLabel>
                <Select multiple value={filterLevels}
                  onChange={e => { setFilterLevels(e.target.value); setPage(1) }}
                  input={<OutlinedInput notched label="JLPT Level" />}
                  renderValue={selected => selected.length === 0 ? 'All' : selected.join(', ')}
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
            <Grid item xs={6} sm={4}>
              <TextField fullWidth select label="Word Type" value={filterType}
                onChange={e => { setFilterType(e.target.value); setPage(1) }}
                size="small" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                <MenuItem value="">All Types</MenuItem>
                {wordTypes.map(t => <MenuItem key={t.id} value={t.type_name}>{t.type_name}</MenuItem>)}
              </TextField>
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
                            <Grid item xs={5.5}>
                              <Autocomplete options={range.lessons || []} getOptionLabel={l => `L${l}`}
                                value={range.from} onChange={(_, val) => setBookRange(book.id, 'from', val)} size="small"
                                renderInput={params => <TextField {...params} label="From" size="small" InputLabelProps={{ shrink: true }} />} />
                            </Grid>
                            <Grid item xs={1} textAlign="center">
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            </Grid>
                            <Grid item xs={5.5}>
                              <Autocomplete
                                options={(range.lessons || []).filter(l => range.from === null || l >= range.from)}
                                getOptionLabel={l => `L${l}`} value={range.to}
                                onChange={(_, val) => setBookRange(book.id, 'to', val)} size="small"
                                renderInput={params => <TextField {...params} label="To" size="small" InputLabelProps={{ shrink: true }} />} />
                            </Grid>
                          </Grid>
                          {(range.from !== null || range.to !== null) && (
                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                📖 {range.from !== null && range.to !== null
                                  ? `Lessons ${range.from} – ${range.to}`
                                  : range.from !== null ? `From Lesson ${range.from}` : `Up to Lesson ${range.to}`}
                              </Typography>
                              <Button size="small" onClick={() => clearBookRange(book.id)}
                                sx={{ color: 'text.disabled', textTransform: 'none', fontSize: '11px', minWidth: 0, p: 0 }}>
                                Clear
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    )
                  })}
                </Grid>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* STATS */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} word{filtered.length !== 1 ? 's' : ''} found
          </Typography>
          {userId && (
            <Chip
              icon={<BookmarkIcon sx={{ fontSize: '14px !important' }} />}
              label="Saved"
              size="small"
              onClick={() => { setShowSavedOnly(s => !s); setPage(1) }}
              variant={showSavedOnly ? 'filled' : 'outlined'}
              sx={{
                cursor: 'pointer',
                backgroundColor: showSavedOnly ? '#1a3a5c' : 'transparent',
                color: showSavedOnly ? 'white' : '#1a3a5c',
                borderColor: '#1a3a5c',
                '& .MuiChip-icon': { color: showSavedOnly ? 'white' : '#1a3a5c' },
              }}
            />
          )}
        </Box>
      </Box>

      {/* VOCAB CARDS */}
      {paginated.length === 0 ? (
        <Box textAlign="center" mt={10}>
          <Typography variant="h4" mb={2}>🔍</Typography>
          <Typography color="text.secondary">No words match your filters.</Typography>
        </Box>
      ) : (
        paginated.map(word => {
          const isRevealed = revealedIds.has(word.id)

          return (
            <Card key={word.id} sx={{ mb: 1.5 }}>
              <CardContent sx={{ py: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                {editingId === word.id ? (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" mb={2}>✏️ Editing Word</Typography>
                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={8}>
                        <TextField fullWidth label="Word (Japanese)" value={editData.word}
                          onChange={e => setEditData(d => ({ ...d, word: e.target.value }))} size="small" required />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField fullWidth label="Reading" value={editData.reading}
                          onChange={e => setEditData(d => ({ ...d, reading: e.target.value }))} size="small" />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth label="Meaning (English)" value={editData.meaning}
                          onChange={e => setEditData(d => ({ ...d, meaning: e.target.value }))} size="small" required />
                      </Grid>
                      <Grid item xs={5}>
                        <TextField fullWidth select label="Word Type" value={editData.word_type_id}
                          onChange={e => setEditData(d => ({ ...d, word_type_id: e.target.value }))}
                          size="small" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                          <MenuItem value="">Select...</MenuItem>
                          {wordTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.type_name}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={4}>
                        <TextField fullWidth select label="JLPT Level" value={editData.jlpt_level_id}
                          onChange={e => setEditData(d => ({ ...d, jlpt_level_id: e.target.value }))}
                          size="small" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                          <MenuItem value="">Select...</MenuItem>
                          {jlptLevels.map(l => <MenuItem key={l.id} value={l.id}>{l.level}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={3}>
                        <TextField fullWidth label="Lesson" type="number" value={editData.lesson_number}
                          onChange={e => setEditData(d => ({ ...d, lesson_number: e.target.value }))} size="small" />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth select label="Book" value={editData.book_id}
                          onChange={e => setEditData(d => ({ ...d, book_id: e.target.value }))}
                          size="small" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                          <MenuItem value="">Select...</MenuItem>
                          {books.map(b => <MenuItem key={b.id} value={b.id}>{b.book_name}</MenuItem>)}
                        </TextField>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1.5 }} />
                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">EXAMPLE SENTENCES</Typography>
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addExample}>Add</Button>
                      </Box>
                      {editData.examples.map((ex, i) => (
                        <Box key={i} mb={1.5}>
                          <TextField fullWidth label="Japanese Sentence" value={ex.japanese_sentence}
                            onChange={e => updateExample(i, 'japanese_sentence', e.target.value)} size="small" sx={{ mb: 1 }} />
                          <Box display="flex" gap={1}>
                            <TextField fullWidth label="English Translation" value={ex.english_translation}
                              onChange={e => updateExample(i, 'english_translation', e.target.value)} size="small" />
                            {editData.examples.length > 1 && (
                              <IconButton onClick={() => removeExample(i)} color="error" size="small"><CloseIcon /></IconButton>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">CONJUGATIONS</Typography>
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addConjugation}>Add</Button>
                      </Box>
                      {editData.conjugations.map((conj, i) => (
                        <Box key={i} display="flex" gap={1} alignItems="center" mb={1}>
                          <TextField label="Form" placeholder="masu" value={conj.form_type}
                            onChange={e => updateConjugation(i, 'form_type', e.target.value)} size="small" sx={{ width: 120 }} />
                          <TextField fullWidth label="Conjugated" value={conj.conjugated_word}
                            onChange={e => updateConjugation(i, 'conjugated_word', e.target.value)} size="small" />
                          {editData.conjugations.length > 1 && (
                            <IconButton onClick={() => removeConjugation(i)} color="error" size="small"><CloseIcon /></IconButton>
                          )}
                        </Box>
                      ))}
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box display="flex" gap={2}>
                      <Button variant="contained" onClick={() => handleSave(word.id)} disabled={saving}
                        sx={{ backgroundColor: '#1a3a5c' }}>
                        {saving ? <CircularProgress size={20} color="inherit" /> : '💾 Save'}
                      </Button>
                      <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                    </Box>
                  </Box>
                ) : (
                  // VIEW MODE
                  <Box>
                    <Box display="flex" flexDirection={isMobile ? 'column' : 'row'}
                      justifyContent="space-between" alignItems={isMobile ? 'flex-start' : 'flex-start'}
                      mb={0.5} gap={isMobile ? 0.5 : 0}>
                      {/* Word + reading + speaker */}
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box>
                          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">{word.word}</Typography>
                          {word.reading && (
                            <Typography variant="caption" color="text.secondary">{word.reading}</Typography>
                          )}
                        </Box>
                        <Tooltip title="Pronounce">
                          <IconButton size="small" onClick={() => speak(word.reading || word.word)} sx={{ color: '#1a3a5c' }}>
                            <VolumeUpIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Chips + eye + bookmark + admin buttons */}
                      <Box display="flex" gap={0.5} alignItems="center" flexWrap="wrap">
                        {word.jlpt_levels?.level && <Chip label={word.jlpt_levels.level} size="small" color="primary" />}
                        {word.word_types?.type_name && <Chip label={word.word_types.type_name} size="small" variant="outlined" />}
                        {word.lesson_number && <Chip label={`L${word.lesson_number}`} size="small" variant="outlined" />}
                        {/* Per-card English toggle */}
                        <Tooltip title={isRevealed ? 'Hide English' : 'Show English'}>
                          <IconButton size="small" onClick={() => toggleReveal(word.id)}
                            sx={{ color: isRevealed ? '#1a3a5c' : '#b0bec5' }}>
                            {isRevealed
                              ? <VisibilityIcon fontSize="small" />
                              : <VisibilityOffIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        {userId && (
                          <Tooltip title={savedIds.has(word.id) ? 'Remove from saved' : 'Save word'}>
                            <IconButton size="small" disabled={savingIds.has(word.id)}
                              onClick={() => handleToggleSave(word.id)}
                              sx={{ color: savedIds.has(word.id) ? '#1a3a5c' : '#b0bec5' }}>
                              {savedIds.has(word.id)
                                ? <BookmarkIcon fontSize="small" />
                                : <BookmarkBorderIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {isAdmin && (
                          <>
                            <IconButton size="small" onClick={() => startEdit(word)} sx={{ color: '#1a3a5c' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete(word.id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>

                    {/* Meaning — always shown */}
                    <Typography variant="body2" color="text.secondary" mb={0.5}>📖 {word.meaning}</Typography>

                    {word.books?.book_name && (
                      <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                        <MenuBookIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">{word.books.book_name}</Typography>
                      </Box>
                    )}

                    {word.example_sentences?.length > 0 && (
                      <Box mb={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">EXAMPLES</Typography>
                        {word.example_sentences.map(ex => (
                          <Box key={ex.id} sx={{ backgroundColor: '#f8fafc', borderRadius: 1, p: 1, mt: 0.5 }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                              <Typography variant="body2" color="warning.dark" sx={{ flex: 1 }}>
                                {ex.japanese_sentence}
                              </Typography>
                              <Tooltip title="Pronounce">
                                <IconButton size="small" onClick={() => speak(ex.japanese_sentence)}
                                  sx={{ color: '#b0bec5', ml: 0.5, mt: '-4px', flexShrink: 0 }}>
                                  <VolumeUpIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            {/* English translation — controlled per card */}
                            {isRevealed && (
                              <Typography variant="caption" color="text.secondary">{ex.english_translation}</Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {word.conjugations?.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">CONJUGATIONS</Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                          {word.conjugations.map(conj => (
                            <Chip key={conj.id} label={`${conj.form_type}: ${conj.conjugated_word}`} size="small"
                              sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: isMobile ? '10px' : '12px' }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )
        })
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3} mb={2}>
          <Pagination count={totalPages} page={page} size={isMobile ? 'small' : 'medium'}
            onChange={(_, val) => { setPage(val); window.scrollTo(0, 0) }}
            color="primary"
            sx={{ '& .MuiPaginationItem-root.Mui-selected': { backgroundColor: '#1a3a5c' } }} />
        </Box>
      )}
    </Box>
  )
}

export default VocabList