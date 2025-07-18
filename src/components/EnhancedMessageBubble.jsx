import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FaPlay, FaPause, FaExpand, FaVolumeUp, FaTrash, FaReply, FaHeart, FaThumbsUp, FaThumbsDown, FaFire, FaHandsHelping, FaCheck, FaEllipsisH } from 'react-icons/fa'
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
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState([])
  const [userReaction, setUserReaction] = useState(null)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const [pendingReaction, setPendingReaction] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  
  const reactionPickerRef = useRef(null)
  const reactionTimeoutRef = useRef(null)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchReactions()
  }, [message.id])

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(false)
      }
    }

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showReactionPicker])

  // Prevent body scroll when reaction picker is open on mobile
  useEffect(() => {
    if (showReactionPicker && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showReactionPicker, isMobile])

  const fetchReactions = async () => {
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
  }

  // Debounced reaction handler for better performance
  const handleReaction = useCallback(async (reactionType) => {
    if (!currentUser || isReacting) return

    // Clear any pending timeout
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current)
    }

    // Set loading state
    setIsReacting(true)
    setPendingReaction(reactionType)

    // Optimistic update
    const isRemoving = userReaction?.reaction_type === reactionType
    
    if (isRemoving) {
      setUserReaction(null)
      setReactions(prev => prev.filter(r => r.user_id !== currentUser.id))
    } else {
      const newReaction = {
        id: 'temp-' + Date.now(),
        message_id: message.id,
        user_id: currentUser.id,
        reaction_type: reactionType,
        users: { nickname: currentUser.nickname }
      }
      setUserReaction(newReaction)
      setReactions(prev => {
        const filtered = prev.filter(r => r.user_id !== currentUser.id)
        return [...filtered, newReaction]
      })
    }

    // Debounce the actual API call
    reactionTimeoutRef.current = setTimeout(async () => {
      try {
        if (isRemoving) {
          // Remove reaction
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

        // Refresh reactions to get the real data
        await fetchReactions()
      } catch (error) {
        console.error('Error handling reaction:', error)
        // Revert optimistic update on error
        await fetchReactions()
      } finally {
        setIsReacting(false)
        setPendingReaction(null)
        setShowReactionPicker(false)
      }
    }, 150) // Reduced debounce time for better responsiveness
  }, [currentUser, userReaction, message.id, isReacting])

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
    // Create a modern confirmation dialog
    const confirmDelete = window.confirm('🗑️ Delete this message?\n\nThis action cannot be undone.')
    
    if (!confirmDelete) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteMessage(message.id)
      if (result.success) {
        // Show success state briefly
        setDeleteSuccess(true)
        setTimeout(() => {
          setDeleteSuccess(false)
        }, 1000)
      } else {
        // Show error with modern alert
        alert('❌ Error: ' + result.message)
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('❌ Failed to delete message. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const getReactionCounts = () => {
    const counts = {}
    reactions.forEach(reaction => {
      counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1
    })
    return counts
  }

  const getReactionUsers = (reactionType) => {
    return reactions
      .filter(r => r.reaction_type === reactionType)
      .map(r => r.users?.nickname)
      .join(', ')
  }

  const reactionCounts = getReactionCounts()
  const hasReactions = Object.keys(reactionCounts).length > 0

  return (
    <>
      <div className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn group`}>
        <div className={`max-w-sm lg:max-w-lg ${isOwn ? 'order-2' : 'order-1'} relative`}>
          {!isOwn && (
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2">
                {getDisplayNickname(message.nickname)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(message.created_at)}
              </div>
            </div>
          )}
          
          <div 
            className={`relative p-4 rounded-2xl shadow-sm ${
              isOwn 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-4' 
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white mr-4 border border-gray-200 dark:border-gray-700'
            }`}
            onMouseEnter={() => !isMobile && setShowActions(true)}
            onMouseLeave={() => !isMobile && setShowActions(false)}
          >
            {/* Subtle Action Menu - Top Right Corner */}
            <div className={`absolute top-2 right-2 ${
              isMobile ? 'opacity-100' : showActions ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-200`}>
              <div className="flex items-center space-x-1">
                {/* Quick React Button */}
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
                    isOwn 
                      ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-100' 
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                  title="React"
                  disabled={isReacting}
                >
                  {isReacting ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaHeart size={10} />
                  )}
                </button>

                {/* Reply Button */}
                <button
                  onClick={() => onReply(message)}
                  className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
                    isOwn 
                      ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-100' 
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                  title="Reply"
                >
                  <FaReply size={10} />
                </button>

                {/* Delete Button (Own Messages Only) */}
                {isOwn && (
                  <button
                    onClick={handleDeleteMessage}
                    disabled={isDeleting || deleteSuccess}
                    className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
                      deleteSuccess 
                        ? 'bg-green-500/20 text-green-100' 
                        : 'bg-red-500/20 hover:bg-red-500/40 text-red-100 disabled:opacity-50'
                    }`}
                    title={deleteSuccess ? "Deleted!" : "Delete"}
                  >
                    {isDeleting ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : deleteSuccess ? (
                      <FaCheck size={10} />
                    ) : (
                      <FaTrash size={10} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Text content */}
            {message.content && (
              <div className="whitespace-pre-wrap break-words leading-relaxed pr-16">
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
                  className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                  title="Expand image"
                >
                  <FaExpand size={10} />
                </button>
              </div>
            )}
            
            {/* Audio content */}
            {message.audio_url && (
              <div className="mt-2 pr-16">
                <div className={`flex items-center p-3 rounded-xl ${isOwn ? 'bg-blue-600/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${isOwn ? 'bg-blue-500' : 'bg-gray-400'}`}>
                    <FaVolumeUp className="text-white" size={12} />
                  </div>
                  <div className="flex-1">
                    <audio
                      controls
                      className="w-full h-6 audio-player"
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
            
            {/* Reactions Display */}
            {hasReactions && (
              <div className="mt-3 flex flex-wrap gap-1">
                {Object.entries(reactionCounts).map(([type, count]) => {
                  const config = REACTION_TYPES[type]
                  const Icon = config.icon
                  const isUserReaction = userReaction?.reaction_type === type
                  return (
                    <button
                      key={type}
                      onClick={() => setShowReactions(!showReactions)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation ${
                        isUserReaction 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : isOwn 
                          ? 'bg-blue-600/20 text-blue-100 hover:bg-blue-600/30' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={`${config.label}: ${getReactionUsers(type)}`}
                    >
                      <Icon size={10} className={isUserReaction ? 'text-white' : config.color} />
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

      {/* Mobile-Optimized Reaction Picker */}
      {showReactionPicker && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setShowReactionPicker(false)}
          />
          
          {/* Reaction Picker */}
          <div 
            ref={reactionPickerRef}
            className={`fixed z-50 ${
              isMobile 
                ? 'bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4'
                : `${isOwn ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3`
            } transition-all duration-200 scale-100 opacity-100`}
          >
            {isMobile && (
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  React to message
                </h3>
                <button
                  onClick={() => setShowReactionPicker(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                >
                  ✕
                </button>
              </div>
            )}
            
            <div className={`flex ${isMobile ? 'justify-center gap-4' : 'flex-col gap-2'}`}>
              {Object.entries(REACTION_TYPES).map(([type, config]) => {
                const Icon = config.icon
                const isActive = userReaction?.reaction_type === type
                const isPending = pendingReaction === type
                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    disabled={isReacting}
                    className={`${
                      isMobile ? 'p-4 rounded-2xl min-w-[60px] min-h-[60px]' : 'p-2 rounded-lg min-w-[36px] min-h-[36px]'
                    } transition-all duration-200 touch-manipulation flex items-center justify-center ${
                      isActive 
                        ? 'bg-blue-100 dark:bg-blue-900 scale-110 ring-2 ring-blue-500' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110 active:scale-95'
                    } ${isReacting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={config.label}
                  >
                    {isPending ? (
                      <div className={`${isMobile ? 'w-6 h-6' : 'w-3 h-3'} border-2 border-current border-t-transparent rounded-full animate-spin`}></div>
                    ) : (
                      <Icon size={isMobile ? 24 : 16} className={config.color} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Mobile-Optimized Reactions Detail Modal */}
      {showReactions && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReactions(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Reactions
              </h3>
              <button
                onClick={() => setShowReactions(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {Object.entries(reactionCounts).map(([type, count]) => {
                const config = REACTION_TYPES[type]
                const Icon = config.icon
                const users = getReactionUsers(type)
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon size={20} className={config.color} />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {config.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {count}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">
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

      {/* Image modal */}
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
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all touch-manipulation"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
} 