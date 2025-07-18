import React, { useState } from 'react'
import { FaPlay, FaPause, FaExpand, FaVolumeUp, FaTrash } from 'react-icons/fa'
import { getDisplayNickname } from '../utils/storage'
import { deleteMessage } from '../utils/userManager'

export const MessageBubble = ({ message, isOwn }) => {
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteButton, setShowDeleteButton] = useState(false)

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
      if (!result.success) {
        alert(result.message)
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className={`flex mb-6 ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
        <div className={`max-w-sm lg:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
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
            onMouseEnter={() => isOwn && setShowDeleteButton(true)}
            onMouseLeave={() => setShowDeleteButton(false)}
          >
            {/* Delete button for own messages */}
            {isOwn && showDeleteButton && (
              <button
                onClick={handleDeleteMessage}
                disabled={isDeleting}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 z-10 disabled:opacity-50"
                title="Delete message"
              >
                {isDeleting ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FaTrash size={12} />
                )}
              </button>
            )}

            {/* Text content */}
            {message.content && (
              <div className="whitespace-pre-wrap break-words leading-relaxed">
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
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                  title="Expand image"
                >
                  <FaExpand size={12} />
                </button>
              </div>
            )}
            
            {/* Audio content */}
            {message.audio_url && (
              <div className="mt-2">
                <div className={`flex items-center p-3 rounded-xl ${isOwn ? 'bg-blue-600/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${isOwn ? 'bg-blue-500' : 'bg-gray-400'}`}>
                    <FaVolumeUp className="text-white" size={16} />
                  </div>
                  <div className="flex-1">
                    <audio
                      controls
                      className="w-full h-8 audio-player"
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
            
            {isOwn && (
              <div className="text-xs mt-2 text-blue-100 opacity-75">
                {formatTime(message.created_at)}
              </div>
            )}
          </div>
        </div>
      </div>

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
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
} 