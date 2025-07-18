import { supabase } from '../lib/supabase'
import { setNickname, setUserId, getNickname, getUserId, clearUserData } from './storage'

// Check if nickname is available
export const checkNicknameAvailability = async (nickname) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', nickname)
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows returned - nickname is available
      return { available: true }
    }

    if (error) {
      throw error
    }

    // Nickname is taken
    return { available: false, message: 'This nickname is already taken' }
  } catch (error) {
    console.error('Error checking nickname:', error)
    return { available: false, message: 'Error checking nickname availability' }
  }
}

// Register a new user
export const registerUser = async (nickname) => {
  try {
    // First check if nickname is available
    const availability = await checkNicknameAvailability(nickname)
    if (!availability.available) {
      return { success: false, message: availability.message }
    }

    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        nickname: nickname
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - nickname taken
        return { success: false, message: 'This nickname is already taken' }
      }
      throw error
    }

    // Save user data to localStorage
    setNickname(nickname)
    setUserId(data.id)

    return { 
      success: true, 
      user: data,
      message: 'Account created successfully!' 
    }
  } catch (error) {
    console.error('Error registering user:', error)
    return { success: false, message: 'Failed to create account' }
  }
}

// Login with existing user ID
export const loginWithUserId = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, message: 'User ID not found' }
      }
      throw error
    }

    // Update last active timestamp
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', userId)

    // Save user data to localStorage
    setNickname(data.nickname)
    setUserId(data.id)

    return { 
      success: true, 
      user: data,
      message: `Welcome back, ${data.nickname}!` 
    }
  } catch (error) {
    console.error('Error logging in:', error)
    return { success: false, message: 'Failed to login' }
  }
}

// Login with nickname only
export const loginWithNickname = async (nickname) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', nickname)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, message: 'No account found with this nickname' }
      }
      throw error
    }

    // Update last active timestamp
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', data.id)

    // Save user data to localStorage
    setNickname(data.nickname)
    setUserId(data.id)

    return { 
      success: true, 
      user: data,
      message: `Welcome back, ${data.nickname}!` 
    }
  } catch (error) {
    console.error('Error logging in with nickname:', error)
    return { success: false, message: 'Failed to login with nickname' }
  }
}

// Claim account with nickname and user ID
export const claimAccount = async (nickname, userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('nickname', nickname)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, message: 'No account found with this nickname and User ID combination' }
      }
      throw error
    }

    // Update last active timestamp
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', userId)

    // Save user data to localStorage
    setNickname(data.nickname)
    setUserId(data.id)

    return { 
      success: true, 
      user: data,
      message: `Account claimed successfully! Welcome back, ${data.nickname}!` 
    }
  } catch (error) {
    console.error('Error claiming account:', error)
    return { success: false, message: 'Failed to claim account' }
  }
}

// Get current user info
export const getCurrentUser = async () => {
  const userId = getUserId()
  const nickname = getNickname()

  if (!userId || !nickname) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Update user's last active timestamp
export const updateLastActive = async () => {
  const userId = getUserId()
  if (!userId) return

  try {
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', userId)
  } catch (error) {
    console.error('Error updating last active:', error)
  }
}

// Logout user
export const logoutUser = () => {
  clearUserData()
}

// Generate a shareable user ID for account recovery
export const getUserShareableId = () => {
  const userId = getUserId()
  const nickname = getNickname()
  
  if (!userId || !nickname) {
    return null
  }

  return {
    userId,
    nickname,
    shareableCode: userId.split('-')[0].toUpperCase() // First part of UUID for easier sharing
  }
}

// Delete a specific message (only if user owns it)
export const deleteMessage = async (messageId) => {
  const userId = getUserId()
  const nickname = getNickname()
  
  if (!userId || !nickname) {
    return { success: false, message: 'User not authenticated' }
  }

  try {
    // First check if the user owns this message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('nickname, user_id')
      .eq('id', messageId)
      .single()

    if (fetchError) {
      return { success: false, message: 'Message not found' }
    }

    // Check if user owns the message (by nickname or user_id)
    if (message.nickname !== nickname && message.user_id !== userId) {
      return { success: false, message: 'You can only delete your own messages' }
    }

    // Delete the message with proper error handling
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return { success: false, message: `Failed to delete: ${deleteError.message}` }
    }

    return { success: true, message: 'Message deleted successfully' }
  } catch (error) {
    console.error('Error deleting message:', error)
    return { success: false, message: 'Failed to delete message' }
  }
}

// Delete all messages for the current user
export const deleteAllUserMessages = async () => {
  const userId = getUserId()
  const nickname = getNickname()
  
  if (!userId || !nickname) {
    return { success: false, message: 'User not authenticated' }
  }

  try {
    // Delete all messages by this user (matching by nickname or user_id)
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`nickname.eq.${nickname},user_id.eq.${userId}`)

    if (error) {
      throw error
    }

    return { success: true, message: 'All your messages have been deleted' }
  } catch (error) {
    console.error('Error deleting all messages:', error)
    return { success: false, message: 'Failed to delete messages' }
  }
}

// Delete all messages containing images for the current user
export const deleteAllUserImages = async () => {
  const userId = getUserId()
  const nickname = getNickname()
  
  if (!userId || !nickname) {
    return { success: false, message: 'User not authenticated' }
  }

  try {
    // Delete all messages with images by this user
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`nickname.eq.${nickname},user_id.eq.${userId}`)
      .not('image_url', 'is', null)

    if (error) {
      throw error
    }

    return { success: true, message: 'All your images have been deleted' }
  } catch (error) {
    console.error('Error deleting user images:', error)
    return { success: false, message: 'Failed to delete images' }
  }
}

// Delete all messages containing audio for the current user
export const deleteAllUserAudio = async () => {
  const userId = getUserId()
  const nickname = getNickname()
  
  if (!userId || !nickname) {
    return { success: false, message: 'User not authenticated' }
  }

  try {
    // Delete all messages with audio by this user
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`nickname.eq.${nickname},user_id.eq.${userId}`)
      .not('audio_url', 'is', null)

    if (error) {
      throw error
    }

    return { success: true, message: 'All your voice messages have been deleted' }
  } catch (error) {
    console.error('Error deleting user audio:', error)
    return { success: false, message: 'Failed to delete voice messages' }
  }
}

// Get count of user's messages by type
export const getUserMessageCounts = async () => {
  const userId = getUserId()
  const nickname = getNickname()
  
  if (!userId || !nickname) {
    return { success: false, message: 'User not authenticated' }
  }

  try {
    // Get all messages by this user
    const { data: messages, error } = await supabase
      .from('messages')
      .select('content, image_url, audio_url')
      .or(`nickname.eq.${nickname},user_id.eq.${userId}`)

    if (error) {
      throw error
    }

    const counts = {
      total: messages.length,
      text: messages.filter(m => m.content && !m.image_url && !m.audio_url).length,
      images: messages.filter(m => m.image_url).length,
      audio: messages.filter(m => m.audio_url).length
    }

    return { success: true, counts }
  } catch (error) {
    console.error('Error getting message counts:', error)
    return { success: false, message: 'Failed to get message counts' }
  }
} 