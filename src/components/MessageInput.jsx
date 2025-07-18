import React, { useState, useRef } from 'react'
import { FaPaperPlane, FaImage, FaTimes } from 'react-icons/fa'
import { AudioRecorder } from './AudioRecorder'
import { supabase } from '../lib/supabase'
import { generateFileName, getUserId } from '../utils/storage'

export const MessageInput = ({ nickname, onMessageSent, disabled, replyToMessage, onClearReply }) => {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [lastMessageTime, setLastMessageTime] = useState(0)
  
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const RATE_LIMIT_MS = 3000 // 3 seconds between messages

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
  }

  const removeImage = () => {
    setSelectedImage(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file, fileName) => {
    try {
      // Show upload progress
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
          }
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const now = Date.now()
    if (now - lastMessageTime < RATE_LIMIT_MS) {
      const remainingTime = Math.ceil((RATE_LIMIT_MS - (now - lastMessageTime)) / 1000)
      setError(`Please wait ${remainingTime} seconds before sending another message`)
      return
    }

    if (!message.trim() && !selectedImage) {
      setError('Please enter a message or select an image')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      let imageUrl = null
      
      if (selectedImage) {
        const fileName = generateFileName(selectedImage.name)
        imageUrl = await uploadFile(selectedImage, fileName)
      }

      const userId = getUserId()
      const messageData = {
        content: message.trim() || null,
        image_url: imageUrl,
        nickname: nickname,
        user_id: userId,
        reply_to: replyToMessage?.id || null
      }

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messageData)

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      // Reset form
      setMessage('')
      removeImage()
      setLastMessageTime(now)
      setUploadProgress(0)
      
      // Clear reply if exists
      if (replyToMessage && onClearReply) {
        onClearReply()
      }

      // Notify parent component
      if (onMessageSent) {
        onMessageSent()
      }

      // Focus back to textarea for better UX
      if (textareaRef.current) {
        textareaRef.current.focus()
      }

    } catch (error) {
      console.error('Error sending message:', error)
      setError(error.message || 'Failed to send message')
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleAudioComplete = async (audioBlob) => {
    const now = Date.now()
    if (now - lastMessageTime < RATE_LIMIT_MS) {
      const remainingTime = Math.ceil((RATE_LIMIT_MS - (now - lastMessageTime)) / 1000)
      setError(`Please wait ${remainingTime} seconds before sending another message`)
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const fileName = generateFileName('audio.webm')
      const audioUrl = await uploadFile(audioBlob, fileName)

      const userId = getUserId()
      const messageData = {
        content: null,
        audio_url: audioUrl,
        nickname: nickname,
        user_id: userId,
        reply_to: replyToMessage?.id || null
      }

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messageData)

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      setLastMessageTime(now)
      setUploadProgress(0)
      
      // Clear reply if exists
      if (replyToMessage && onClearReply) {
        onClearReply()
      }

      // Notify parent component
      if (onMessageSent) {
        onMessageSent()
      }

    } catch (error) {
      console.error('Error sending audio message:', error)
      setError(error.message || 'Failed to send audio message')
    } finally {
      setIsUploading(false)
    }
  }

  const canSend = (message.trim() || selectedImage) && !isUploading
  const isFormDisabled = disabled || isUploading

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4">
      {/* Reply indicator - Mobile Optimized */}
      {replyToMessage && (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                Replying to {replyToMessage.nickname}
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                {replyToMessage.content || (replyToMessage.image_url ? '📷 Image' : '🎵 Audio')}
              </p>
            </div>
            <button
              onClick={onClearReply}
              className="ml-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 touch-manipulation"
              title="Cancel reply"
            >
              <FaTimes size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Upload progress - Mobile Optimized */}
      {isUploading && uploadProgress > 0 && (
        <div className="mb-2 sm:mb-3">
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message - Mobile Optimized */}
      {error && (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Image preview - Mobile Optimized */}
      {imagePreview && (
        <div className="mb-2 sm:mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-24 sm:max-w-32 h-auto rounded-lg border border-gray-300 dark:border-gray-600"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors touch-manipulation"
            title="Remove image"
          >
            <FaTimes size={12} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="input-field resize-none min-h-[44px] max-h-32 text-sm sm:text-base"
            rows={1}
            disabled={isFormDisabled}
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isFormDisabled}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isFormDisabled}
            className="p-2 sm:p-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Upload image"
          >
            <FaImage size={14} className="sm:size-4" />
          </button>

          <AudioRecorder
            onRecordingComplete={handleAudioComplete}
            disabled={isFormDisabled}
          />

          <button
            type="submit"
            disabled={!canSend}
            className="btn-primary p-2 sm:p-2.5 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            title="Send message"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPaperPlane size={14} className="sm:size-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
} 