import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FaPlay, FaPause, FaExpand, FaVolumeUp, FaTrash, FaReply, FaHeart, FaThumbsUp, FaThumbsDown, FaFire, FaHandsHelping, FaCheck } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getDisplayNickname, getUserId } from '../utils/storage'
import { deleteMessage } from '../utils/userManager'

const REACTION_TYPES = {
  love: { icon: FaHeart, color: 'text-red-500', label: 'Love' },
  good: { icon: FaThumbsUp, color: 'text-green-500', label: 'Good' },
  bad: { icon: FaThumbsDown, color: 'text-red-500', label: 'Bad' },
  motivation: { icon: FaHandsHelping, color: 'text-blue-500', label: 'Motivation' },
  fire: { icon: FaFire, color: 'text-orange-500', label: 'Fire' }
}

export const EnhancedMessageBubble = ({ message, isOwn, currentUser, onReply }) => {
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteButton, setShowDeleteButton] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState([])
  const [userReaction, setUserReaction] = useState(null)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [isReacting, setIsReacting] = useState(false)

  // Debounce reaction handling to prevent rapid clicking
  const [reactionDebounce, setReactionDebounce] = useState(null)

  useEffect(() => {
    fetchReactions()
  }, [message.id])

  const fetchReactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select(`
          *,
          users (nickname, profile_color)
        `)
        .eq('message_id', message.id)

      if (error) throw error

      setReactions(data || [])
      
      // Find current user's reaction
      const currentUserReaction = data?.find(r => r.user_id === currentUser?.id)
      setUserReaction(currentUserReaction)
    } catch (error) {
      console.error('Error fetching reactions:', error)
    }
  }, [message.id, currentUser?.id])

  const handleReaction = useCallback(async (reactionType) => {
    if (!currentUser || isReacting) return

    // Clear any existing debounce
    if (reactionDebounce) {
      clearTimeout(reactionDebounce)
    }

    // Set debounce to prevent rapid clicking
    const debounceTimer = setTimeout(async () => {
      setIsReacting(true)
      try {
        if (userReaction?.reaction_type === reactionType) {
          // Remove reaction if clicking the same one
          const { error } = await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', message.id)
            .eq('user_id', currentUser.id)

          if (error) throw error
        } else {
          // Remove any existing reaction first, then add new one
          await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', message.id)
            .eq('user_id', currentUser.id)

          // Add new reaction
          const { error } = await supabase
            .from('message_reactions')
            .insert({
              message_id: message.id,
              user_id: currentUser.id,
              reaction_type: reactionType
            })

          if (error) throw error
        }

        await fetchReactions()
        setShowReactionPicker(false)
      } catch (error) {
        console.error('Error handling reaction:', error)
      } finally {
        setIsReacting(false)
      }
    }, 100) // 100ms debounce

    setReactionDebounce(debounceTimer)
  }, [currentUser, userReaction, message.id, fetchReactions, isReacting, reactionDebounce])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (reactionDebounce) {
        clearTimeout(reactionDebounce)
      }
    }
  }, [reactionDebounce])

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleImageClick = () => {
    setIsImageExpanded(true)
  }

  const handleAudioPlay = (audio) => {
    setIsAudioPlaying(true)
    audio.onended = () => setIsAudioPlaying(false)
  }

  const handleAudioPause = () => {
    setIsAudioPlaying(false)
  }

  const handleDeleteMessage = async () => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteMessage(message.id)
      if (result.success) {
        setDeleteSuccess(true)
        setTimeout(() => setDeleteSuccess(false), 2000)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReply = () => {
    onReply(message)
  }

  // Memoize expensive calculations
  const reactionCounts = useMemo(() => {
    const counts = {}
    reactions.forEach(reaction => {
      counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1
    })
    return counts
  }, [reactions])

  const hasReactions = Object.keys(reactionCounts).length > 0

  const getReactionUsers = useCallback((reactionType) => {
    const users = reactions
      .filter(r => r.reaction_type === reactionType)
      .map(r => getDisplayNickname(r.users?.nickname || 'Unknown'))
    return users.join(', ')
  }, [reactions])

  return (
    <>
      <div className={`flex mb-4 sm:mb-6 ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
        <div className={`max-w-xs sm:max-w-sm lg:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
          {!isOwn && (
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold mr-2">
                {getDisplayNickname(message.nickname)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(message.created_at)}
              </div>
            </div>
          )}
          
          <div 
            className={`relative p-3 sm:p-4 rounded-2xl shadow-sm ${
              isOwn 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-2 sm:ml-4' 
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white mr-2 sm:mr-4 border border-gray-200 dark:border-gray-700'
            }`}
            onMouseEnter={() => setShowDeleteButton(true)}
            onMouseLeave={() => setShowDeleteButton(false)}
          >
            {/* Action buttons - Mobile Optimized */}
            <div className={`absolute ${isOwn ? 'left-2 sm:left-3' : 'right-2 sm:right-3'} -top-3 sm:-top-4 flex space-x-1 sm:space-x-2`}>
              {/* Reply button */}
              <button
                onClick={handleReply}
                className="p-2 sm:p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 border-2 border-white touch-manipulation"
                title="Reply to this message"
              >
                <FaReply size={10} className="sm:hidden" />
                <FaReply size={12} className="hidden sm:block" />
              </button>

              {/* Reaction button */}
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                disabled={isReacting}
                className={`p-2 sm:p-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 border-2 border-white touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                  showReactionPicker ? 'bg-pink-600' : 'bg-pink-500 hover:bg-pink-600'
                }`}
                title="Add reaction"
              >
                {isReacting ? (
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FaHeart size={10} className="sm:hidden text-white" />
                    <FaHeart size={12} className="hidden sm:block text-white" />
                  </>
                )}
              </button>

              {/* Delete button for own messages */}
              {isOwn && (
                <button
                  onClick={handleDeleteMessage}
                  disabled={isDeleting || deleteSuccess}
                  className={`p-2 sm:p-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 disabled:cursor-not-allowed border-2 border-white touch-manipulation ${
                    deleteSuccess 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-red-500 hover:bg-red-600 disabled:opacity-50'
                  }`}
                  title={deleteSuccess ? "Message deleted!" : "Delete this message"}
                >
                  {isDeleting ? (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : deleteSuccess ? (
                    <>
                      <FaCheck size={10} className="sm:hidden text-white" />
                      <FaCheck size={12} className="hidden sm:block text-white" />
                    </>
                  ) : (
                    <>
                      <FaTrash size={10} className="sm:hidden text-white" />
                      <FaTrash size={12} className="hidden sm:block text-white" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Reaction Picker - Mobile Optimized */}
            {showReactionPicker && (
              <div className={`absolute ${isOwn ? 'left-2 sm:left-3' : 'right-2 sm:right-3'} top-10 sm:top-12 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5 sm:p-2 flex space-x-1 z-20`}>
                {Object.entries(REACTION_TYPES).map(([type, config]) => {
                  const Icon = config.icon
                  const isActive = userReaction?.reaction_type === type
                  return (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      disabled={isReacting}
                      className={`p-2 sm:p-2.5 rounded-lg hover:scale-110 transition-all duration-200 touch-manipulation disabled:opacity-50 ${
                        isActive ? 'bg-blue-100 dark:bg-blue-900 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={config.label}
                    >
                      <Icon size={14} className={`sm:size-4 ${config.color}`} />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Text content */}
            {message.content && (
              <div className="whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-base">
                {message.content}
              </div>
            )}
            
            {/* Image content */}
            {message.image_url && (
              <div className="mt-2">
                <img
                  src={message.image_url}
                  alt="Shared image"
                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handleImageClick}
                  loading="lazy"
                />
                <button
                  onClick={handleImageClick}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 hover:opacity-100 transition-opacity touch-manipulation"
                  title="Expand image"
                >
                  <FaExpand size={12} />
                </button>
              </div>
            )}
            
            {/* Audio content */}
            {message.audio_url && (
              <div className="mt-2">
                <div className={`flex items-center p-2 sm:p-3 rounded-xl ${isOwn ? 'bg-blue-600/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-2 sm:mr-3 ${isOwn ? 'bg-blue-500' : 'bg-gray-400'}`}>
                    <FaVolumeUp className="text-white" size={14} />
                  </div>
                  <div className="flex-1">
                    <audio
                      controls
                      className="w-full h-6 sm:h-8 audio-player"
                      onPlay={(e) => handleAudioPlay(e.target)}
                      onPause={handleAudioPause}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <source src={message.audio_url} type="audio/webm" />
                      <source src={message.audio_url} type="audio/ogg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </div>
            )}
            
            {/* Reactions Display - Mobile Optimized */}
            {hasReactions && (
              <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-2">
                {Object.entries(reactionCounts).map(([type, count]) => {
                  const config = REACTION_TYPES[type]
                  const Icon = config.icon
                  const isUserReaction = userReaction?.reaction_type === type
                  return (
                    <button
                      key={type}
                      onClick={() => setShowReactions(!showReactions)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs transition-all duration-200 hover:scale-105 touch-manipulation ${
                        isUserReaction 
                          ? 'bg-blue-500 text-white shadow-lg' 
                          : isOwn 
                          ? 'bg-blue-600/20 text-blue-100 hover:bg-blue-600/30' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={`${config.label}: ${getReactionUsers(type)}`}
                    >
                      <Icon size={10} className={`sm:size-3 ${isUserReaction ? 'text-white' : config.color}`} />
                      <span className="font-medium text-xs">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
            
            {isOwn && (
              <div className="text-xs mt-2 text-blue-100 opacity-75">
                {formatTime(message.created_at)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reactions Detail Modal - Mobile Optimized */}
      {showReactions && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReactions(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Reactions
            </h3>
            <div className="space-y-3">
              {Object.entries(reactionCounts).map(([type, count]) => {
                const config = REACTION_TYPES[type]
                const Icon = config.icon
                const users = getReactionUsers(type)
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon size={18} className={`sm:size-5 ${config.color}`} />
                      <span className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">
                        {config.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {count}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 max-w-32 truncate">
                        {users}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Image modal - Mobile Optimized */}
      {isImageExpanded && message.image_url && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsImageExpanded(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={message.image_url}
              alt="Expanded image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setIsImageExpanded(false)}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all touch-manipulation"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
} 