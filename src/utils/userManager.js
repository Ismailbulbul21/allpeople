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