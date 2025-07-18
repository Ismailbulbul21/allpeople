import { supabase } from '../lib/supabase'

// Array of daily questions in Somali and English
const DAILY_QUESTIONS = [
  {
    somali: "Magacaaga oo dhameestiran, meesha aad joogtaa, ma arday baa tahay mise waad dhameesay wax barashada?",
    english: "What is your full name, where are you located, are you a student or have you completed your studies?"
  },
  {
    somali: "Maxay tahay shaqada aad ugu xiiseynaysaa, maxaase ka dhigaya mid xiiso leh?",
    english: "What is the job you are most interested in, and what makes it interesting?"
  },
  {
    somali: "Maxay tahay hobbigaaga ugu wanaagsan, maxaase ka baratay?",
    english: "What is your favorite hobby, and what have you learned from it?"
  },
  {
    somali: "Meesha aad ku kordhay, maxay kaa barisay nolol ahaan?",
    english: "Where did you grow up, and what did it teach you about life?"
  },
  {
    somali: "Maxay tahay riyada aad ugu weyn tahay, sidee u qorsheynaysaa inaad gaadhsiiso?",
    english: "What is your biggest dream, and how do you plan to achieve it?"
  },
  {
    somali: "Maxay tahay waqtiga aad ugu wanaagsan tahay maalinta, maxaase ka dhigaya mid gaar ah?",
    english: "What is your favorite time of day, and what makes it special?"
  },
  {
    somali: "Maxay tahay cunada aad ugu jeceshahay, maxaase ka dhigaya mid xiiso leh?",
    english: "What is your favorite food, and what makes it special?"
  },
  {
    somali: "Maxay tahay buugga ama filimka aad ugu dambeeyay akhriyay/daawatay, maxaase ka bartay?",
    english: "What is the last book or movie you read/watched, and what did you learn from it?"
  },
  {
    somali: "Maxay tahay safarka aad ugu xiiseynaysaa, maxaase ka dhigaya mid xiiso leh?",
    english: "What is the trip you are most excited about, and what makes it interesting?"
  },
  {
    somali: "Maxay tahay xirfadda aad ugu wanaagsan tahay, sidee u baratay?",
    english: "What is your best skill, and how did you learn it?"
  }
]

// Get today's question based on date
export const getTodaysQuestion = () => {
  const today = new Date()
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000)
  const questionIndex = dayOfYear % DAILY_QUESTIONS.length
  return DAILY_QUESTIONS[questionIndex]
}

// Create or update today's question in the database
export const ensureTodaysQuestion = async () => {
  try {
    // Check if we have any questions at all
    const { data: allQuestions, error: allError } = await supabase
      .from('daily_questions')
      .select('*')
      .order('created_at', { ascending: true })

    if (allError) throw allError

    // If no questions exist, create the first one
    if (!allQuestions || allQuestions.length === 0) {
      const firstQuestion = DAILY_QUESTIONS[0]
      const { error: insertError } = await supabase
        .from('daily_questions')
        .insert({
          question_text: firstQuestion.english,
          question_somali: firstQuestion.somali,
          question_date: new Date().toISOString().split('T')[0],
          is_active: true
        })

      if (insertError) throw insertError
      console.log('Created first daily question')
      return true
    }

    // Get the most recent active question
    const { data: activeQuestion, error: activeError } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeError && activeError.code !== 'PGRST116') {
      throw activeError
    }

    // If we have an active question, check if 24 hours have passed
    if (activeQuestion) {
      const questionTime = new Date(activeQuestion.created_at)
      const now = new Date()
      const timeDiff = now - questionTime
      const twentyFourHours = 24 * 60 * 60 * 1000

      // If less than 24 hours have passed, keep the current question
      if (timeDiff < twentyFourHours) {
        console.log('Current question still active, time remaining:', Math.floor((twentyFourHours - timeDiff) / 3600000), 'hours')
        return true
      }

      // 24 hours have passed, create next question
      const today = new Date().toISOString().split('T')[0]
      const nextQuestion = getTodaysQuestion()

      // Deactivate current question
      await supabase
        .from('daily_questions')
        .update({ is_active: false })
        .eq('id', activeQuestion.id)

      // Create new question
      const { error: insertError } = await supabase
        .from('daily_questions')
        .insert({
          question_text: nextQuestion.english,
          question_somali: nextQuestion.somali,
          question_date: today,
          is_active: true
        })

      if (insertError) throw insertError
      console.log('Created new daily question after 24 hours')
    }

    return true
  } catch (error) {
    console.error('Error ensuring today\'s question:', error)
    return false
  }
}

// Get current active question
export const getCurrentQuestion = async () => {
  try {
    const { data, error } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching current question:', error)
    return null
  }
}

// Initialize daily question system
export const initializeDailyQuestions = async () => {
  await ensureTodaysQuestion()
  
  // Set up interval to check for new questions every hour
  setInterval(async () => {
    await ensureTodaysQuestion()
  }, 60 * 60 * 1000) // Check every hour
}

// Get time until next question
export const getTimeUntilNextQuestion = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  const diffMs = tomorrow - now
  const diffHours = Math.floor(diffMs / 3600000)
  const diffMins = Math.floor((diffMs % 3600000) / 60000)
  
  return {
    hours: diffHours,
    minutes: diffMins,
    formatted: `${diffHours}h ${diffMins}m`
  }
} 