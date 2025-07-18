import React, { useState } from 'react'
import { FaUser, FaKey, FaSpinner, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa'
import { registerUser, loginWithUserId, loginWithNickname, claimAccount, checkNicknameAvailability } from '../utils/userManager'

export const NicknameSetup = ({ onUserSetup }) => {
  const [mode, setMode] = useState('register') // 'register' or 'login'
  const [nickname, setNickname] = useState('')
  const [userId, setUserId] = useState('')
  const [loginNickname, setLoginNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [nicknameStatus, setNicknameStatus] = useState(null) // 'checking', 'available', 'taken'
  const [checkTimeout, setCheckTimeout] = useState(null)
  const [showUserIdResult, setShowUserIdResult] = useState(null) // Show user ID after registration

  const handleNicknameChange = (e) => {
    const value = e.target.value
    setNickname(value)
    setError('')
    
    // Clear previous timeout
    if (checkTimeout) {
      clearTimeout(checkTimeout)
    }
    
    // Only check if nickname is long enough
    if (value.trim().length >= 2) {
      setNicknameStatus('checking')
      
      // Debounce the check
      const timeout = setTimeout(async () => {
        const result = await checkNicknameAvailability(value.trim())
        setNicknameStatus(result.available ? 'available' : 'taken')
      }, 500)
      
      setCheckTimeout(timeout)
    } else {
      setNicknameStatus(null)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const trimmedNickname = nickname.trim()
    
    if (trimmedNickname.length < 2) {
      setError('Nickname must be at least 2 characters long')
      return
    }
    
    if (trimmedNickname.length > 20) {
      setError('Nickname must be less than 20 characters')
      return
    }

    if (nicknameStatus === 'taken') {
      setError('This nickname is already taken')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await registerUser(trimmedNickname)
      
      if (result.success) {
        // Show the User ID to the user first
        setShowUserIdResult(result.user)
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const trimmedUserId = userId.trim()
    const trimmedNickname = loginNickname.trim()
    
    if (!trimmedUserId && !trimmedNickname) {
      setError('Please enter either User ID or nickname')
      return
    }

    setIsLoading(true)
    setError('')

              try {
      let result
      
      if (trimmedUserId && trimmedNickname) {
        // Both provided - use claim account for extra security
        result = await claimAccount(trimmedNickname, trimmedUserId)
      } else if (trimmedUserId) {
        // Only User ID provided
        result = await loginWithUserId(trimmedUserId)
      } else if (trimmedNickname) {
        // Only nickname provided
        result = await loginWithNickname(trimmedNickname)
      }
      
      if (result.success) {
        onUserSetup(result.user, result.message)
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  const getNicknameStatusIcon = () => {
    switch (nicknameStatus) {
      case 'checking':
        return <FaSpinner className="animate-spin text-blue-500" />
      case 'available':
        return <FaCheck className="text-green-500" />
      case 'taken':
        return <FaTimes className="text-red-500" />
      default:
        return null
    }
  }

  // Handle confirming the User ID display
  const handleConfirmUserId = () => {
    if (showUserIdResult) {
      onUserSetup(showUserIdResult, 'Account created successfully!')
      setShowUserIdResult(null)
    }
  }

  // Show User ID result modal
  if (showUserIdResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <FaCheck className="mx-auto text-4xl text-green-500 mb-2" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Account Created!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Welcome, {showUserIdResult.nickname}!
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Your User ID (save this to access from other devices):
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded border p-3">
              <code className="text-sm text-gray-800 dark:text-gray-200 break-all">
                {showUserIdResult.id}
              </code>
            </div>
          </div>

          <button
            onClick={handleConfirmUserId}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <FaUser className="mx-auto text-4xl text-blue-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to OpenChat
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {mode === 'register' 
              ? 'Choose a unique nickname to get started' 
              : 'Enter your User ID to access your account'
            }
          </p>
        </div>

        <div className="flex mb-6">
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-lg border ${
              mode === 'register'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            New User
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-lg border-t border-r border-b ${
              mode === 'login'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            Existing User
          </button>
        </div>

        {mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose your nickname
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nickname}
                  onChange={handleNicknameChange}
                  placeholder="Enter a unique nickname"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  maxLength={20}
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-2.5">
                  {getNicknameStatusIcon()}
                </div>
              </div>
              {nicknameStatus === 'taken' && (
                <p className="text-red-500 text-sm mt-1">This nickname is already taken</p>
              )}
              {nicknameStatus === 'available' && (
                <p className="text-green-500 text-sm mt-1">Nickname is available!</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || nicknameStatus === 'taken' || nickname.trim().length < 2}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your User ID (optional)
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your Nickname (optional)
              </label>
              <input
                type="text"
                value={loginNickname}
                onChange={(e) => setLoginNickname(e.target.value)}
                placeholder="Your nickname"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> Enter your nickname OR User ID to access your account. Both fields provide extra security.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || (!userId.trim() && !loginNickname.trim())}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Logging in...
                </>
              ) : (
                <>
                  <FaKey className="mr-2" />
                  Access Account
                </>
              )}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <div className="flex items-start">
            <FaInfoCircle className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Account Recovery</p>
              <p>
                After creating an account, you'll receive a User ID. Save this ID to access your account from any device!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 