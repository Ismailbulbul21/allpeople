import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { EnhancedMessageBubble } from './EnhancedMessageBubble'
import { getNickname } from '../utils/storage'

export const ChatBox = ({ nickname, refreshTrigger, currentUser, onReply }) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  const scrollToBottom = () => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100
      setShouldAutoScroll(isAtBottom)
    }
  }

  const fetchMessages = async () => {
    try {
      setError(null)
      console.log('Fetching messages...')
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }

      console.log('Messages fetched:', data?.length || 0)
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [refreshTrigger])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Set up real-time subscription for messages
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message received:', payload.new)
          const newMessage = payload.new
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Message updated:', payload.new)
          const updatedMessage = payload.new
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Message deleted:', payload.old)
          const deletedMessage = payload.old
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id))
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
      })

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchMessages}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Be the first to say hello! 👋
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <EnhancedMessageBubble
              key={message.id}
              message={message}
              isOwn={message.nickname === nickname}
              currentUser={currentUser}
              onReply={onReply}
            />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  )
} 