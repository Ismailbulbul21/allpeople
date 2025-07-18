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
        return
      }

      if (data) {
        setDailyQuestion(data)
      } else {
        // If no question for today, get the first question (default)
        const { data: firstQuestion, error: firstError } = await supabase
          .from('daily_questions')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (firstError && firstError.code !== 'PGRST116') {
          console.error('Error fetching first question:', error)
          return
        }

        setDailyQuestion(firstQuestion)
      }
    } catch (error) {
      console.error('Error fetching daily question:', error)
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

  if (!dailyQuestion) return null

  const isExpiringSoon = timeProgress > 90
  const isExpiringSoon2Hours = timeProgress > 75

  return (
    <div className={`text-white sticky top-0 z-40 shadow-lg transition-all duration-500 ${
      isExpiringSoon ? 'bg-gradient-to-r from-red-500 to-red-600' :
      isExpiringSoon2Hours ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
      'bg-gradient-to-r from-green-500 to-blue-600'
    }`}>
      <div className="px-4 py-3">
        {/* Question Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FaPin className="text-yellow-300" size={16} />
            <span className="font-bold text-sm">Daily Question</span>
          </div>
          <div className={`flex items-center space-x-2 text-xs px-2 py-1 rounded-full ${
            timeProgress > 90 ? 'bg-red-500 bg-opacity-80 animate-pulse' : 
            timeProgress > 75 ? 'bg-orange-500 bg-opacity-60' : 
            'bg-white bg-opacity-20'
          }`}>
            <FaClock size={12} />
            <span className="font-bold">{timeLeft}</span>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-3">
          {isExpiringSoon && !userAnswer && (
            <div className="mb-2 bg-red-600 bg-opacity-80 px-3 py-2 rounded-lg border border-red-400">
              <p className="text-xs font-bold animate-pulse">
                ⚠️ URGENT: Question expires soon! Answer now before it's too late!
              </p>
            </div>
          )}
          <p className="text-sm font-medium mb-1">
            {dailyQuestion.question_somali}
          </p>
          <p className="text-xs opacity-90">
            {dailyQuestion.question_text}
          </p>
        </div>

        {/* Time Progress Bar */}
        <div className="mb-3">
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                timeProgress > 90 ? 'bg-red-400' : 
                timeProgress > 75 ? 'bg-orange-400' : 
                timeProgress > 50 ? 'bg-yellow-300' : 
                'bg-green-400'
              }`}
              style={{ width: `${timeProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs mt-1 opacity-75">
            <span>Question started</span>
            <span>24h expires</span>
          </div>
        </div>

        {/* User's Answer Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {userAnswer ? (
              <div className="flex items-center space-x-2">
                <FaCheck className="text-green-300" size={14} />
                <span className="text-xs">You answered at {formatTime(userAnswer.created_at)}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                <span className="text-xs">Waiting for your answer...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchAllAnswers()
                setShowAllAnswers(true)
              }}
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-full transition-colors"
            >
              View All ({allAnswers.length})
            </button>
            
            {!userAnswer && (
              <button
                onClick={() => setShowAnswerForm(true)}
                className="text-xs bg-yellow-400 text-yellow-900 hover:bg-yellow-300 px-3 py-1 rounded-full font-medium transition-colors"
              >
                Answer Now
              </button>
            )}
          </div>
        </div>
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