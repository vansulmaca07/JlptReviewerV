import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  Box, Card, CardContent, Typography, TextField, MenuItem,
  Button, IconButton, Divider, Grid, CircularProgress
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'

function AddVocabForm({ onSuccess }) {
  const [wordTypes, setWordTypes] = useState([])
  const [jlptLevels, setJlptLevels] = useState([])
  const [loading, setLoading] = useState(false)
  const [word, setWord] = useState('')
  const [reading, setReading] = useState('')
  const [wordTypeId, setWordTypeId] = useState('')
  const [meaning, setMeaning] = useState('')
  const [lessonNumber, setLessonNumber] = useState('')
  const [jlptLevelId, setJlptLevelId] = useState('')
  const [examples, setExamples] = useState([{ japanese_sentence: '', english_translation: '' }])
  const [conjugations, setConjugations] = useState([{ form_type: '', conjugated_word: '' }])

  useEffect(() => { fetchReferenceData() }, [])

  async function fetchReferenceData() {
    const [{ data: types }, { data: levels }] = await Promise.all([
      supabase.from('word_types').select('*'),
      supabase.from('jlpt_levels').select('*')
    ])
    setWordTypes(types || [])
    setJlptLevels(levels || [])
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
        .insert({ word, reading, word_type_id: wordTypeId || null, meaning, lesson_number: lessonNumber || null, jlpt_level_id: jlptLevelId || null })
        .select().single()
      if (vocabError) throw vocabError

      const vocabId = vocabData.id
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
      setLessonNumber(''); setJlptLevelId('')
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
<Grid item xs={4}>
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
<Grid item xs={3}>
  <TextField fullWidth label="Lesson No." placeholder="28" type="number"
    value={lessonNumber} onChange={e => setLessonNumber(e.target.value)} size="small" />
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