import React, { useState } from 'react'
import { FaUser, FaCopy, FaCheck, FaSignOutAlt, FaTimes, FaKey } from 'react-icons/fa'
import { getUserShareableId, logoutUser } from '../utils/userManager'

export const UserProfile = ({ user, onClose, onLogout }) => {
  const [copied, setCopied] = useState(false)
  const shareableData = getUserShareableId()

  const handleCopyUserId = async () => {
    if (shareableData) {
      try {
        await navigator.clipboard.writeText(shareableData.userId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const handleLogout = () => {
    logoutUser()
    onLogout()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-auto p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            User Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* User Info */}
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FaUser className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {user.nickname}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* User ID for Account Recovery */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FaKey className="text-blue-500 mr-2" />
              <h4 className="font-medium text-gray-900 dark:text-white">
                Account Recovery ID
              </h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Save this ID to access your account from any device:
            </p>
            
            <div className="bg-white dark:bg-gray-800 rounded border p-3 mb-3">
              <div className="flex items-start justify-between gap-3">
                <code className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all leading-relaxed flex-1 font-mono">
                  {shareableData?.userId}
                </code>
                <button
                  onClick={handleCopyUserId}
                  className="p-2 text-gray-500 hover:text-blue-500 flex-shrink-0 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Copy User ID"
                >
                  {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> Keep this ID safe! You'll need it to access your account on other devices.
              </p>
            </div>
          </div>

          {/* Quick Share Code */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Quick Share Code
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              For easier sharing, you can use this shorter code:
            </p>
            <div className="bg-white dark:bg-gray-800 rounded border p-3 text-center">
              <code className="text-xl sm:text-2xl font-mono text-blue-600 dark:text-blue-400 font-bold tracking-wider">
                {shareableData?.shareableCode}
              </code>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Note: Use the full User ID above for account recovery
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-red-500 text-white py-3 px-6 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center font-medium"
            >
              <FaSignOutAlt className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 