import { supabase } from '../supabaseClient'

export async function getSavedWordIds(userId) {
  const { data, error } = await supabase
    .from('saved_words')
    .select('vocab_id')
    .eq('user_id', userId)
  if (error) { console.error(error); return new Set() }
  return new Set(data.map(d => d.vocab_id))
}

export async function saveWord(userId, vocabId) {
  const { error } = await supabase
    .from('saved_words')
    .upsert({ user_id: userId, vocab_id: vocabId }, { onConflict: 'user_id,vocab_id' })
  if (error) console.error(error)
}

export async function unsaveWord(userId, vocabId) {
  const { error } = await supabase
    .from('saved_words')
    .delete()
    .eq('user_id', userId)
    .eq('vocab_id', vocabId)
  if (error) console.error(error)
}

export async function toggleSavedWord(userId, vocabId, savedIds) {
  if (savedIds.has(vocabId)) {
    await unsaveWord(userId, vocabId)
    return false // now unsaved
  } else {
    await saveWord(userId, vocabId)
    return true // now saved
  }
}