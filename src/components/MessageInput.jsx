import React, { useState, useRef } from 'react'
import { FaPaperPlane, FaImage, FaTimes } from 'react-icons/fa'
import { AudioRecorder } from './AudioRecorder'
import { supabase } from '../lib/supabase'
import { generateFileName, compressImage, formatFileSize, getUserId } from '../utils/storage'

export const MessageInput = ({ nickname, onMessageSent, disabled }) => {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [lastMessageTime, setLastMessageTime] = useState(0)
  
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const RATE_LIMIT_MS = 3000 // 3 seconds between messages
  const MAX_IMAGE_SIZE = 1024 * 1024 // 1MB

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Image too large (max ${formatFileSize(MAX_IMAGE_SIZE)})`)
      return
    }

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
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  const sendMessage = async (content, imageFile, audioBlob) => {
    const now = Date.now()
    if (now - lastMessageTime < RATE_LIMIT_MS) {
      setError(`Please wait ${Math.ceil((RATE_LIMIT_MS - (now - lastMessageTime)) / 1000)} seconds`)
      return
    }

    if (!content && !imageFile && !audioBlob) {
      setError('Please enter a message or select a file')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      let imageUrl
      let audioUrl

      // Upload image if present
      if (imageFile) {
        const compressedImage = await compressImage(imageFile)
        const fileName = generateFileName(nickname, 'jpg')
        imageUrl = await uploadFile(compressedImage, fileName)
      }

      // Upload audio if present
      if (audioBlob) {
        const fileName = generateFileName(nickname, 'webm')
        audioUrl = await uploadFile(audioBlob, fileName)
      }

      // Insert message into database
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          nickname,
          content: content || null,
          image_url: imageUrl || null,
          audio_url: audioUrl || null,
          user_id: getUserId()
        })

      if (insertError) {
        throw new Error(`Failed to send message: ${insertError.message}`)
      }

      // Reset form
      setMessage('')
      removeImage()
      setLastMessageTime(now)
      onMessageSent()

      // Focus back to textarea
      if (textareaRef.current) {
        textareaRef.current.focus()
      }

    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() || selectedImage) {
      sendMessage(message.trim(), selectedImage || undefined)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleAudioComplete = (audioBlob) => {
    sendMessage(undefined, undefined, audioBlob)
  }

  const isFormDisabled = disabled || isUploading
  const canSend = (message.trim() || selectedImage) && !isFormDisabled

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      {error && (
        <div className="mb-3 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-32 max-h-32 rounded-lg object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
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
            className="input-field resize-none min-h-[44px] max-h-32"
            rows={1}
            disabled={isFormDisabled}
          />
        </div>

        <div className="flex items-center gap-2">
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
            className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload image"
          >
            <FaImage size={16} />
          </button>

          <AudioRecorder
            onRecordingComplete={handleAudioComplete}
            disabled={isFormDisabled}
          />

          <button
            type="submit"
            disabled={!canSend}
            className="btn-primary p-2 rounded-full"
            title="Send message"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPaperPlane size={16} />
            )}
          </button>
        </div>
      </form>
    </div>
  )
} 