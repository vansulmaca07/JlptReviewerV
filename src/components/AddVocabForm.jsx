import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  Box, Card, CardContent, Typography, TextField, MenuItem,
  Button, IconButton, Divider, Grid, CircularProgress, Checkbox
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'

function AddVocabForm({ onSuccess }) {
  const [wordTypes, setWordTypes] = useState([])
  const [jlptLevels, setJlptLevels] = useState([])
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [word, setWord] = useState('')
  const [reading, setReading] = useState('')
  const [wordTypeId, setWordTypeId] = useState('')
  const [meaning, setMeaning] = useState('')
  const [jlptLevelId, setJlptLevelId] = useState('')
  const [bookAssignments, setBookAssignments] = useState([])
  const [examples, setExamples] = useState([{ japanese_sentence: '', english_translation: '' }])
  const [conjugations, setConjugations] = useState([{ form_type: '', conjugated_word: '' }])

  useEffect(() => { fetchReferenceData() }, [])

  async function fetchReferenceData() {
    const [{ data: types }, { data: levels }, { data: booksData }] = await Promise.all([
      supabase.from('word_types').select('*'),
      supabase.from('jlpt_levels').select('*'),
      supabase.from('books').select('*, jlpt_levels(level)').order('id'),
    ])
    setWordTypes(types || [])
    setJlptLevels(levels || [])
    setBooks(booksData || [])
  }

  function toggleBookAssignment(bookId) {
    setBookAssignments(prev => {
      const exists = prev.some(b => b.book_id === bookId)
      return exists
        ? prev.filter(b => b.book_id !== bookId)
        : [...prev, { book_id: bookId, lesson_number: '' }]
    })
  }
  function updateBookLesson(bookId, val) {
    setBookAssignments(prev => prev.map(b => b.book_id === bookId ? { ...b, lesson_number: val } : b))
  }

  function addExample() { setExamples([...examples, { japanese_sentence: '', english_translation: '' }]) }
  function updateExample(i, field, value) { const u = [...examples]; u[i][field] = value; setExamples(u) }
  function removeExample(i) { setExamples(examples.filter((_, idx) => idx !== i)) }

  function addConjugation() { setConjugations([...conjugations, { form_type: '', conjugated_word: '' }]) }
  function updateConjugation(i, field, value) { const u = [...conjugations]; u[i][field] = value; setConjugations(u) }
  function removeConjugation(i) { setConjugations(conjugations.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: vocabData, error: vocabError } = await supabase
        .from('vocabulary')
        .insert({ word, reading, word_type_id: wordTypeId || null, meaning, jlpt_level_id: jlptLevelId || null })
        .select().single()
      if (vocabError) throw vocabError

      const vocabId = vocabData.id
      const validBookAssignments = bookAssignments.filter(b => b.book_id)
      if (validBookAssignments.length > 0) {
        const { error: bookError } = await supabase.from('vocabulary_books')
          .insert(validBookAssignments.map(b => ({ vocab_id: vocabId, book_id: b.book_id, lesson_number: b.lesson_number || null })))
        if (bookError) throw bookError
      }

      const validExamples = examples.filter(e => e.japanese_sentence.trim())
      if (validExamples.length > 0) {
        const { error: exError } = await supabase.from('example_sentences')
          .insert(validExamples.map(ex => ({ vocab_id: vocabId, japanese_sentence: ex.japanese_sentence, english_translation: ex.english_translation })))
        if (exError) throw exError
      }

      const validConj = conjugations.filter(c => c.conjugated_word.trim())
      if (validConj.length > 0) {
        const { error: conjError } = await supabase.from('conjugations')
          .insert(validConj.map(c => ({ vocab_id: vocabId, form_type: c.form_type, conjugated_word: c.conjugated_word })))
        if (conjError) throw conjError
      }

      setWord(''); setReading(''); setWordTypeId(''); setMeaning('')
      setJlptLevelId(''); setBookAssignments([])
      setExamples([{ japanese_sentence: '', english_translation: '' }])
      setConjugations([{ form_type: '', conjugated_word: '' }])
      onSuccess()
    } catch (error) {
      console.error(error)
      alert('Error! Check console.')
    }
    setLoading(false)
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 700, mx: 'auto' }}>

      {/* BASIC INFO */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>Basic Info</Typography>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField fullWidth label="Word (Japanese)" placeholder="例：食べる"
                value={word} onChange={e => setWord(e.target.value)} required size="small" />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="Reading (Furigana)" placeholder="例：たべる"
                value={reading} onChange={e => setReading(e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12}>
  <TextField fullWidth label="Meaning (English)" placeholder="to eat"
    value={meaning} onChange={e => setMeaning(e.target.value)} required size="small" />
</Grid>
<Grid item xs={5}>
  <TextField
    fullWidth
    select
    label="Word Type"
    value={wordTypeId}
    onChange={e => setWordTypeId(e.target.value)}
    size="small"
    SelectProps={{ displayEmpty: true }}
    InputLabelProps={{ shrink: true }}
  >
    <MenuItem value="">Select...</MenuItem>
    {wordTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.type_name}</MenuItem>)}
  </TextField>
</Grid>
<Grid item xs={7}>
  <TextField
    fullWidth
    select
    label="JLPT Level"
    value={jlptLevelId}
    onChange={e => setJlptLevelId(e.target.value)}
    size="small"
    SelectProps={{ displayEmpty: true }}
    InputLabelProps={{ shrink: true }}
  >
    <MenuItem value="">Select...</MenuItem>
    {jlptLevels.map(l => <MenuItem key={l.id} value={l.id}>{l.level}</MenuItem>)}
  </TextField>
</Grid>
<Grid item xs={12}>
  <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>BOOK ASSIGNMENTS</Typography>
  {books.map(book => {
    const assignment = bookAssignments.find(b => b.book_id === book.id)
    const isChecked = !!assignment
    return (
      <Box key={book.id} display="flex" alignItems="center" gap={1} mb={0.5}>
        <Checkbox checked={isChecked} size="small"
          onChange={() => toggleBookAssignment(book.id)}
          sx={{ color: '#1a3a5c', '&.Mui-checked': { color: '#1a3a5c' }, p: 0.5 }} />
        <Typography variant="body2" sx={{ flex: 1 }}>
          {book.book_name}
          <Typography component="span" variant="caption" color="text.disabled" ml={0.5}>
            ({book.jlpt_levels?.level})
          </Typography>
        </Typography>
        {isChecked && (
          <TextField label="Lesson" type="number" value={assignment.lesson_number}
            onChange={e => updateBookLesson(book.id, e.target.value)}
            size="small" sx={{ width: 90 }} inputProps={{ min: 1 }} />
        )}
      </Box>
    )
  })}
</Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* EXAMPLE SENTENCES */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">Example Sentences</Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addExample}>Add</Button>
          </Box>
          {examples.map((ex, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <TextField fullWidth label="Japanese Sentence" placeholder="毎日朝ご飯を食べます"
                value={ex.japanese_sentence} onChange={e => updateExample(i, 'japanese_sentence', e.target.value)}
                size="small" sx={{ mb: 1 }} />
              <Box display="flex" gap={1}>
                <TextField fullWidth label="English Translation" placeholder="I eat breakfast every day"
                  value={ex.english_translation} onChange={e => updateExample(i, 'english_translation', e.target.value)}
                  size="small" />
                {examples.length > 1 && (
                  <IconButton onClick={() => removeExample(i)} color="error" size="small">
                    <CloseIcon />
                  </IconButton>
                )}
              </Box>
              {i < examples.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* CONJUGATIONS */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">Conjugations</Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addConjugation}>Add</Button>
          </Box>
          {conjugations.map((conj, i) => (
            <Box key={i} display="flex" gap={1} alignItems="center" mb={1}>
              <TextField label="Form Type" placeholder="masu" value={conj.form_type}
                onChange={e => updateConjugation(i, 'form_type', e.target.value)}
                size="small" sx={{ width: 150 }} />
              <TextField fullWidth label="Conjugated Word" placeholder="食べます"
                value={conj.conjugated_word} onChange={e => updateConjugation(i, 'conjugated_word', e.target.value)}
                size="small" />
              {conjugations.length > 1 && (
                <IconButton onClick={() => removeConjugation(i)} color="error" size="small">
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* SUBMIT */}
      <Button type="submit" variant="contained" fullWidth size="large"
        disabled={loading} sx={{ backgroundColor: '#1a3a5c', py: 1.5, fontSize: '16px' }}>
        {loading ? <CircularProgress size={24} color="inherit" /> : '✅ Save Word'}
      </Button>

    </Box>
  )
}

export default AddVocabForm