import React, { useState, useEffect } from 'react'
import { ChatBox } from './components/ChatBox'
import { MessageInput } from './components/MessageInput'
import { NicknameSetup } from './components/NicknameSetup'
import { UserProfile } from './components/UserProfile'
import { GroupMembersList } from './components/GroupMembersList'
import { getNickname, getUserId, getDisplayNickname } from './utils/storage'
import { getCurrentUser, updateLastActive } from './utils/userManager'
import { initializeDailyQuestions } from './utils/dailyQuestionManager'
import { FaMoon, FaSun, FaUser, FaComments, FaUsers } from 'react-icons/fa'

function App() {
  const [user, setUser] = useState(null)
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [showGroupMembers, setShowGroupMembers] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [replyToMessage, setReplyToMessage] = useState(null)

  useEffect(() => {
    // Check for saved user
    const checkUser = async () => {
      const savedNickname = getNickname()
      const savedUserId = getUserId()
      
      if (savedNickname && savedUserId) {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          updateLastActive()
        } else {
          setShowNicknamePrompt(true)
        }
      } else {
        setShowNicknamePrompt(true)
      }
    }

    checkUser()

    // Initialize daily questions system
    initializeDailyQuestions()

    // Check for dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true' || 
                  (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const handleUserSetup = (userData, message) => {
    setUser(userData)
    setShowNicknamePrompt(false)
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleUserLogout = () => {
    setUser(null)
    setShowNicknamePrompt(true)
    setShowUserProfile(false)
  }

  const handleChangeNickname = () => {
    setShowUserProfile(true)
  }

  const handleMessageSent = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    document.documentElement.classList.toggle('dark', newDarkMode)
  }

  const formatNickname = (nick) => {
    return getDisplayNickname(nick)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Daily Question Header - Mobile Optimized */}
      {user && (
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white sticky top-0 z-50 shadow-lg">
          <div className="px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base sm:text-lg flex-shrink-0">📌</span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-sm block truncate">
                    🇸🇴 Magacaaga oo dhameestiran, meesha aad joogtaa, maxaad qabataa?
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowGroupMembers(true)}
                  className="p-1.5 sm:p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors touch-manipulation"
                  title="Group members"
                >
                  <FaUsers size={12} className="sm:hidden" />
                  <FaUsers size={14} className="hidden sm:block" />
                </button>
                <button
                  onClick={handleChangeNickname}
                  className="p-1.5 sm:p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors touch-manipulation"
                  title="User profile"
                >
                  <FaUser size={12} className="sm:hidden" />
                  <FaUser size={14} className="hidden sm:block" />
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 sm:p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors touch-manipulation"
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <>
                      <FaSun size={12} className="sm:hidden" />
                      <FaSun size={14} className="hidden sm:block" />
                    </>
                  ) : (
                    <>
                      <FaMoon size={12} className="sm:hidden" />
                      <FaMoon size={14} className="hidden sm:block" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Header - Mobile Optimized */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-md flex items-center justify-center">
                  <span className="text-xs font-bold text-transparent bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text">
                    SO
                  </span>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                Somali oo dhan
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                Public chat community
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {user && (
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-20 sm:max-w-none truncate">
                {formatNickname(user.nickname)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 text-center text-sm">
          {successMessage}
        </div>
      )}

      {/* Chat Area - Mobile Optimized */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {user ? (
          <>
            <ChatBox 
              nickname={user.nickname} 
              refreshTrigger={refreshTrigger} 
              currentUser={user}
              onReply={setReplyToMessage}
            />
            <MessageInput
              nickname={user.nickname}
              onMessageSent={handleMessageSent}
              replyToMessage={replyToMessage}
              onClearReply={() => setReplyToMessage(null)}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <div className="relative mx-auto mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mx-auto">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-base sm:text-lg font-bold text-transparent bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text">
                      SO
                    </span>
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Somali oo dhan
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                A public chat room where messages automatically delete after 24 hours
              </p>
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        )}
      </main>

      {/* User Setup Modal */}
      {showNicknamePrompt && (
        <NicknameSetup onUserSetup={handleUserSetup} />
      )}

      {/* User Profile Modal */}
      {showUserProfile && user && (
        <UserProfile
          user={user}
          onClose={() => setShowUserProfile(false)}
          onLogout={handleUserLogout}
        />
      )}

      {/* Group Members Modal */}
      {showGroupMembers && user && (
        <GroupMembersList
          isOpen={showGroupMembers}
          onClose={() => setShowGroupMembers(false)}
          currentUser={user}
        />
      )}
    </div>
  )
}

export default App
