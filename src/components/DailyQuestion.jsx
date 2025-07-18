import React, { useState, useEffect } from 'react'
import { FaPin, FaMicrophone, FaPlay, FaPause, FaCheck, FaTimes, FaClock } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { AudioRecorder } from './AudioRecorder'
import { getUserId, generateFileName } from '../utils/storage'

export const DailyQuestion = ({ currentUser }) => {
  const [dailyQuestion, setDailyQuestion] = useState(null)
  const [userAnswer, setUserAnswer] = useState(null)
  const [showAnswerForm, setShowAnswerForm] = useState(false)
  const [answerText, setAnswerText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allAnswers, setAllAnswers] = useState([])
  const [showAllAnswers, setShowAllAnswers] = useState(false)
  const [playingAudio, setPlayingAudio] = useState(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [timeProgress, setTimeProgress] = useState(0)

  useEffect(() => {
    fetchDailyQuestion()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchDailyQuestion()
    }
  }, [currentUser])

  useEffect(() => {
    if (dailyQuestion && currentUser) {
      fetchUserAnswer()
    }
  }, [dailyQuestion, currentUser])

  // Update time countdown every minute
  useEffect(() => {
    const updateTimeLeft = () => {
      setTimeLeft(getTimeUntilNextQuestion())
    }

    updateTimeLeft() // Initial update
    const interval = setInterval(updateTimeLeft, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [dailyQuestion])

  const fetchDailyQuestion = async () => {
    try {
      // Always try to get today's question first
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('question_date', today)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily question:', error)
      }

      if (data) {
        setDailyQuestion(data)
      } else {
        // If no question for today, get the most recent active question
        const { data: activeQuestion, error: activeError } = await supabase
          .from('daily_questions')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (activeError && activeError.code !== 'PGRST116') {
          console.error('Error fetching active question:', activeError)
        }

        if (activeQuestion) {
          setDailyQuestion(activeQuestion)
        } else {
          // Fallback: Create the default question if none exists
          const fallbackQuestion = {
            id: 'fallback',
            question_somali: "Magacaaga oo dhameestiran, meesha aad joogtaa, ma arday baa tahay mise waad dhameesay wax barashada?",
            question_text: "What is your full name, where are you located, are you a student or have you completed your studies?",
            created_at: new Date().toISOString(),
            is_active: true
          }
          setDailyQuestion(fallbackQuestion)
        }
      }
    } catch (error) {
      console.error('Error fetching daily question:', error)
      // Always show fallback question if there's an error
      const fallbackQuestion = {
        id: 'fallback',
        question_somali: "Magacaaga oo dhameestiran, meesha aad joogtaa, ma arday baa tahay mise waad dhameesay wax barashada?",
        question_text: "What is your full name, where are you located, are you a student or have you completed your studies?",
        created_at: new Date().toISOString(),
        is_active: true
      }
      setDailyQuestion(fallbackQuestion)
    }
  }

  const fetchUserAnswer = async () => {
    if (!currentUser || !dailyQuestion) return

    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('question_id', dailyQuestion.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user answer:', error)
        return
      }

      setUserAnswer(data)
    } catch (error) {
      console.error('Error fetching user answer:', error)
    }
  }

  const fetchAllAnswers = async () => {
    if (!dailyQuestion) return

    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select(`
          *,
          users (nickname, profile_color)
        `)
        .eq('question_id', dailyQuestion.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllAnswers(data || [])
    } catch (error) {
      console.error('Error fetching all answers:', error)
    }
  }

  const handleTextSubmit = async () => {
    if (!answerText.trim() || !currentUser || !dailyQuestion) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .upsert({
          user_id: currentUser.id,
          question_id: dailyQuestion.id,
          answer_text: answerText.trim()
        })
        .select()
        .single()

      if (error) throw error

      setUserAnswer(data)
      setAnswerText('')
      setShowAnswerForm(false)
    } catch (error) {
      console.error('Error submitting answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAudioSubmit = async (audioBlob) => {
    if (!currentUser || !dailyQuestion) return

    setIsSubmitting(true)
    try {
      // Upload audio file
      const fileName = generateFileName(currentUser.nickname, 'webm')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, audioBlob, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName)

      // Save answer to database
      const { data, error } = await supabase
        .from('user_answers')
        .upsert({
          user_id: currentUser.id,
          question_id: dailyQuestion.id,
          answer_audio_url: urlData.publicUrl
        })
        .select()
        .single()

      if (error) throw error

      setUserAnswer(data)
      setShowAnswerForm(false)
    } catch (error) {
      console.error('Error submitting audio answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const playAudio = (audioUrl, answerId) => {
    if (playingAudio === answerId) {
      // Stop current audio
      setPlayingAudio(null)
      return
    }

    setPlayingAudio(answerId)
    const audio = new Audio(audioUrl)
    audio.play()
    audio.onended = () => setPlayingAudio(null)
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getTimeUntilNextQuestion = () => {
    if (!dailyQuestion) return "Loading..."
    
    const now = new Date()
    const questionDate = new Date(dailyQuestion.created_at)
    const twentyFourHoursLater = new Date(questionDate.getTime() + 24 * 60 * 60 * 1000)
    
    const diffMs = twentyFourHoursLater - now
    const totalMs = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    
    if (diffMs <= 0) {
      setTimeProgress(100)
      return "New question available!"
    }
    
    // Calculate progress percentage (how much time has passed)
    const progress = ((totalMs - diffMs) / totalMs) * 100
    setTimeProgress(Math.min(progress, 100))
    
    const diffHours = Math.floor(diffMs / 3600000)
    const diffMins = Math.floor((diffMs % 3600000) / 60000)
    
    return `${diffHours}h ${diffMins}m left`
  }

  const isExpiringSoon = timeProgress > 90
  const isExpiringSoon2Hours = timeProgress > 75

  // Always show the component, even if loading
  return (
    <div className={`text-white sticky top-0 z-50 shadow-2xl transition-all duration-500 border-b-4 border-white border-opacity-20 ${
      isExpiringSoon ? 'bg-gradient-to-r from-red-500 to-red-600' :
      isExpiringSoon2Hours ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
      'bg-gradient-to-r from-green-500 to-blue-600'
    }`}>
      <div className="px-4 py-4">
        {/* Question Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-400 rounded-full">
              <FaPin className="text-yellow-900" size={18} />
            </div>
            <div>
              <span className="font-bold text-lg">Daily Question</span>
              <p className="text-xs opacity-90">Everyone must answer!</p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-full font-bold ${
            timeProgress > 90 ? 'bg-red-500 bg-opacity-90 animate-pulse' : 
            timeProgress > 75 ? 'bg-orange-500 bg-opacity-70' : 
            'bg-white bg-opacity-25'
          }`}>
            <FaClock size={14} />
            <span>{timeLeft}</span>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-4">
          {!dailyQuestion ? (
            <div className="bg-white bg-opacity-15 rounded-xl p-4 mb-3">
              <div className="animate-pulse">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-white bg-opacity-30 rounded mr-2"></div>
                  <div className="h-4 bg-white bg-opacity-30 rounded flex-1"></div>
                </div>
                <div className="h-3 bg-white bg-opacity-20 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white bg-opacity-20 rounded w-1/2"></div>
              </div>
              <div className="text-center mt-4">
                <div className="inline-flex items-center text-sm font-medium">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading today's question...
                </div>
              </div>
            </div>
          ) : (
            <>
              {isExpiringSoon && !userAnswer && (
                <div className="mb-3 bg-red-600 bg-opacity-90 px-4 py-3 rounded-xl border-2 border-red-400 shadow-lg">
                  <p className="text-sm font-bold animate-pulse flex items-center">
                    <span className="text-lg mr-2">⚠️</span>
                    URGENT: Question expires soon! Answer now before it's too late!
                  </p>
                </div>
              )}
              <div className="bg-white bg-opacity-15 rounded-xl p-4 mb-3">
                <p className="text-base font-bold mb-2 leading-relaxed">
                  🇸🇴 {dailyQuestion.question_somali}
                </p>
                <p className="text-sm opacity-90 leading-relaxed">
                  🇬🇧 {dailyQuestion.question_text}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Time Progress Bar */}
        {dailyQuestion && (
          <div className="mb-4">
            <div className="w-full bg-white bg-opacity-25 rounded-full h-3 shadow-inner">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ease-out shadow-sm ${
                  timeProgress > 90 ? 'bg-red-400 shadow-red-500/50' : 
                  timeProgress > 75 ? 'bg-orange-400 shadow-orange-500/50' : 
                  timeProgress > 50 ? 'bg-yellow-300 shadow-yellow-500/50' : 
                  'bg-green-400 shadow-green-500/50'
                }`}
                style={{ width: `${timeProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-2 opacity-80 font-medium">
              <span>🕐 Question started</span>
              <span>⏰ 24h expires</span>
            </div>
          </div>
        )}

        {/* User's Answer Status */}
        {dailyQuestion && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {userAnswer ? (
                <div className="flex items-center space-x-2 bg-green-500 bg-opacity-20 px-3 py-2 rounded-full">
                  <FaCheck className="text-green-300" size={16} />
                  <span className="text-sm font-medium">Answered at {formatTime(userAnswer.created_at)}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-yellow-500 bg-opacity-20 px-3 py-2 rounded-full">
                  <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Waiting for your answer...</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  fetchAllAnswers()
                  setShowAllAnswers(true)
                }}
                className="text-sm bg-white bg-opacity-25 hover:bg-opacity-35 px-4 py-2 rounded-full transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                👥 View All ({allAnswers.length})
              </button>
              
              {!userAnswer && (
                <button
                  onClick={() => setShowAnswerForm(true)}
                  className="text-sm bg-yellow-400 text-yellow-900 hover:bg-yellow-300 px-4 py-2 rounded-full font-bold transition-all duration-200 shadow-lg hover:shadow-xl animate-pulse"
                >
                  🎤 Answer Now!
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Answer Form Modal */}
      {showAnswerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Answer Daily Question
              </h3>
              <button
                onClick={() => setShowAnswerForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {dailyQuestion.question_somali}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dailyQuestion.question_text}
              </p>
            </div>

            {/* Text Answer */}
            <div className="mb-4">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={4}
              />
            </div>

            {/* Audio Answer */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Or record your answer:
              </p>
              <AudioRecorder
                onRecordingComplete={handleAudioSubmit}
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleTextSubmit}
              disabled={!answerText.trim() || isSubmitting}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        </div>
      )}

      {/* All Answers Modal */}
      {showAllAnswers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                All Answers ({allAnswers.length})
              </h3>
              <button
                onClick={() => setShowAllAnswers(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-4">
              {allAnswers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No answers yet. Be the first to answer!
                </div>
              ) : (
                <div className="space-y-4">
                  {allAnswers.map((answer) => (
                    <div
                      key={answer.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: answer.users?.profile_color || '#3B82F6' }}
                          >
                            {answer.users?.nickname?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {answer.users?.nickname}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(answer.created_at)}
                        </span>
                      </div>

                      {answer.answer_text && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {answer.answer_text}
                        </p>
                      )}

                      {answer.answer_audio_url && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => playAudio(answer.answer_audio_url, answer.id)}
                            className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600 transition-colors"
                          >
                            {playingAudio === answer.id ? <FaPause size={12} /> : <FaPlay size={12} />}
                            <span className="text-xs">Voice Answer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 