const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

async function callGemini(prompt, retryCount = 0) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,  // increased from 2048
      }
    })
  })

  if (response.status === 429 && retryCount < 2) {
    const wait = (retryCount + 1) * 4000
    await new Promise(r => setTimeout(r, wait))
    return callGemini(prompt, retryCount + 1)
  }

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')

  const stripped = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
  const firstBrace = stripped.indexOf('{')
  const lastBrace = stripped.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in response')
  }

  try {
    return JSON.parse(stripped.slice(firstBrace, lastBrace + 1))
  } catch {
    throw new Error('Failed to parse Gemini response as JSON')
  }
}

export async function generateReadingExercise({ vocabWords, topic, level }) {
  const wordList = vocabWords.slice(0, 20).join('、')  // reduced from 30

  const prompt = `You are a Japanese language teacher creating a JLPT ${level}-level reading comprehension exercise.

IMPORTANT: Keep the passage SHORT — maximum 5-6 sentences. Do not write long paragraphs.

Your task:
1. Write a SHORT original Japanese passage (5-6 sentences only) about the topic: "${topic}"
2. Use simple grammar and vocabulary appropriate for ${level} level
3. Naturally use SOME of these vocabulary words in the passage: ${wordList}
4. Write 4 comprehension questions in Japanese, each with 4 answer choices (A~D)
5. Questions should test understanding of the passage content

You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no code fences, no explanation.

{"passage":"Japanese passage here","questions":[{"question":"Q1 in Japanese","choices":["A. choice1","B. choice2","C. choice3","D. choice4"],"answer":"A","explanation":"Why A is correct"},{"question":"Q2","choices":["A. choice1","B. choice2","C. choice3","D. choice4"],"answer":"B","explanation":"Why B is correct"},{"question":"Q3","choices":["A. choice1","B. choice2","C. choice3","D. choice4"],"answer":"C","explanation":"Why C is correct"},{"question":"Q4","choices":["A. choice1","B. choice2","C. choice3","D. choice4"],"answer":"A","explanation":"Why A is correct"}]}`

  return callGemini(prompt)
}