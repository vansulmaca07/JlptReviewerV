import { supabase } from '../supabaseClient'

/**
 * Builds a filtered vocabulary query based on activeFilter.
 * activeFilter = { levels: [], bookRanges: [{ bookId, from, to }], savedVocabIds: [] | null }
 *
 * Returns array of matching vocabulary IDs to use in .in('id', ids)
 * OR null if no filter applied (meaning fetch all).
 *
 * Book/lesson filtering now uses the vocabulary_books junction table,
 * supporting words that belong to multiple books.
 */
export async function getFilteredVocabIds(activeFilter) {
  if (!activeFilter) return null

  const { levels, bookRanges, savedVocabIds } = activeFilter

  // If savedVocabIds is provided, use that directly (ignore other filters)
  if (savedVocabIds !== null && savedVocabIds !== undefined) {
    return savedVocabIds.length > 0 ? savedVocabIds : []
  }

  const hasLevels = levels && levels.length > 0
  const hasRanges = bookRanges && bookRanges.some(r => r.from !== null || r.to !== null)

  if (!hasLevels && !hasRanges) return null // no filter, fetch all

  // Get level IDs upfront if needed
  let levelIds = []
  if (hasLevels) {
    const { data: levelData } = await supabase
      .from('jlpt_levels').select('id, level')
      .in('level', levels)
    levelIds = (levelData || []).map(l => l.id)
  }

  if (!hasRanges) {
    // Level filter only — query vocabulary directly (jlpt_level_id lives on vocabulary)
    const { data } = await supabase
      .from('vocabulary').select('id')
      .in('jlpt_level_id', levelIds)
    return (data || []).map(d => d.id)
  }

  // Has ranges — query through vocabulary_books junction table
  // Each active book range runs independently; results are OR-combined (union)
  const promises = bookRanges
    .filter(({ from, to }) => from !== null || to !== null)
    .map(async ({ bookId, from, to }) => {
      let q = supabase
        .from('vocabulary_books')
        .select('vocab_id, vocabulary!inner(id, jlpt_level_id)')
        .eq('book_id', bookId)

      if (from !== null) q = q.gte('lesson_number', from)
      if (to !== null) q = q.lte('lesson_number', to)

      // Apply level filter via the joined vocabulary row
      if (hasLevels) q = q.in('vocabulary.jlpt_level_id', levelIds)

      const { data } = await q
      return (data || []).map(d => d.vocab_id)
    })

  const results = await Promise.all(promises)
  // Deduplicate — a word in multiple books should only appear once
  return [...new Set(results.flat())]
}