import { supabase } from '../supabaseClient'

/**
 * Builds a filtered vocabulary query based on activeFilter.
 * activeFilter = { levels: [], bookRanges: [{ bookId, from, to }], savedVocabIds: [] | null }
 *
 * Returns array of matching vocabulary IDs to use in .in('id', ids)
 * OR null if no filter applied (meaning fetch all).
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
    // Level filter only — simple query
    const { data } = await supabase
      .from('vocabulary').select('id')
      .in('jlpt_level_id', levelIds)
    return (data || []).map(d => d.id)
  }

  // Has ranges — only query books that actually have a range set
  const promises = bookRanges.filter(({ from, to }) => from !== null || to !== null).map(async ({ bookId, from, to }) => {
    let q = supabase.from('vocabulary').select('id').eq('book_id', bookId)

    // Apply lesson range if set
    if (from !== null) q = q.gte('lesson_number', from)
    if (to !== null) q = q.lte('lesson_number', to)

    // Apply level filter if set
    if (hasLevels) q = q.in('jlpt_level_id', levelIds)

    const { data } = await q
    return (data || []).map(d => d.id)
  })

  const results = await Promise.all(promises)
  return results.flat()
}