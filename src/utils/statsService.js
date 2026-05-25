import { supabase } from '../supabaseClient'

// ============================================================
// SESSION MANAGEMENT
// ============================================================

export async function startSession(userId, mode, filter = {}) {
  const { data, error } = await supabase.from('review_sessions').insert({
    user_id: userId,
    mode,
    jlpt_level: filter.levels?.join(',') || null,
    book_id: filter.bookRanges?.[0]?.bookId || null,
    lesson_from: filter.bookRanges?.[0]?.from || null,
    lesson_to: filter.bookRanges?.[0]?.to || null,
  }).select('id').single()
  if (error) { console.error('startSession error:', error); return null }
  return data.id
}

export async function completeSession(sessionId, stats) {
  const { error } = await supabase.from('review_sessions').update({
    total_cards: stats.total,
    correct_count: stats.correct,
    wrong_count: stats.wrong,
    skipped_count: stats.skipped || 0,
    duration_seconds: stats.durationSeconds || null,
    completed_at: new Date().toISOString(),
  }).eq('id', sessionId)
  if (error) console.error('completeSession error:', error)
}

// ============================================================
// WORD ATTEMPT LOGGING
// ============================================================

export async function logAttempt(userId, sessionId, vocabId, mode, isCorrect) {
  // Log the attempt
  const { error: attemptError } = await supabase.from('word_attempts').insert({
    user_id: userId,
    session_id: sessionId,
    vocab_id: vocabId,
    mode,
    is_correct: isCorrect,
  })
  if (attemptError) console.error('logAttempt error:', attemptError)

  // Update mastery via the DB function
  const { error: masteryError } = await supabase.rpc('update_word_mastery', {
    p_user_id: userId,
    p_vocab_id: vocabId,
    p_is_correct: isCorrect,
  })
  if (masteryError) console.error('update_word_mastery error:', masteryError)

  // Update daily activity
  const { error: activityError } = await supabase.rpc('update_daily_activity', {
    p_user_id: userId,
    p_words_reviewed: 1,
    p_words_correct: isCorrect ? 1 : 0,
    p_is_new_word: false, // we'll check this server-side if needed later
  })
  if (activityError) console.error('update_daily_activity error:', activityError)
}

// Batch log (for modes that track all at once at the end)
export async function logAttemptsBatch(userId, sessionId, attempts, mode) {
  for (const attempt of attempts) {
    await logAttempt(userId, sessionId, attempt.vocabId, mode, attempt.isCorrect)
  }
}

// ============================================================
// STATS FETCHING
// ============================================================

export async function fetchLevelProgress(userId) {
  const { data, error } = await supabase
    .from('level_progress')
    .select('*')
    .eq('user_id', userId)
  if (error) { console.error(error); return [] }
  return data || []
}

export async function fetchWeakestWords(userId, limit = 10) {
  const { data, error } = await supabase
    .from('weakest_words')
    .select('*')
    .eq('user_id', userId)
    .limit(limit)
  if (error) { console.error(error); return [] }
  return data || []
}

export async function fetchWordsDueForReview(userId, limit = 20) {
  const { data, error } = await supabase
    .from('words_due_for_review')
    .select('*')
    .eq('user_id', userId)
    .limit(limit)
  if (error) { console.error(error); return [] }
  return data || []
}

export async function fetchStreak(userId) {
  const { data, error } = await supabase
    .from('study_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') console.error(error)
  return data || { current_streak: 0, longest_streak: 0, last_study_date: null }
}

export async function fetchDailyActivity(userId, days = 30) {
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const { data, error } = await supabase
    .from('daily_activity')
    .select('*')
    .eq('user_id', userId)
    .gte('activity_date', fromDate.toISOString().split('T')[0])
    .order('activity_date', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

export async function fetchRecentSessions(userId, limit = 10) {
  const { data, error } = await supabase
    .from('review_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit)
  if (error) { console.error(error); return [] }
  return data || []
}

export async function fetchTotalWordsPerLevel() {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('jlpt_level_id, jlpt_levels(level)')
  if (error) { console.error(error); return {} }
  const counts = {}
  ;(data || []).forEach(v => {
    const level = v.jlpt_levels?.level
    if (level) counts[level] = (counts[level] || 0) + 1
  })
  return counts
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') console.error(error)
  return data
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
  if (error) console.error(error)
}
