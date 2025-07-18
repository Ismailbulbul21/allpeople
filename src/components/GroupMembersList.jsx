import React, { useState, useEffect } from 'react'
import { FaUsers, FaTimes, FaCircle, FaMicrophone, FaCamera } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import { getDisplayNickname } from '../utils/storage'

export const GroupMembersList = ({ isOpen, onClose, currentUser }) => {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [onlineCount, setOnlineCount] = useState(0)

  useEffect(() => {
    if (isOpen) {
      fetchMembers()
      const interval = setInterval(fetchMembers, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('last_active', { ascending: false })

      if (error) throw error

      // Update online status based on last_active (online if active within 5 minutes)
      const now = new Date()
      const membersWithStatus = data.map(member => ({
        ...member,
        isOnline: new Date(member.last_active) > new Date(now.getTime() - 5 * 60 * 1000)
      }))

      setMembers(membersWithStatus)
      setOnlineCount(membersWithStatus.filter(m => m.isOnline).length)
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLastSeen = (lastActive) => {
    const now = new Date()
    const lastSeenDate = new Date(lastActive)
    const diffMs = now - lastSeenDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 5) return 'Online'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return lastSeenDate.toLocaleDateString()
  }

  const getProfileColor = (member) => {
    return member.profile_color || '#3B82F6'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <FaUsers size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Group Members</h2>
                <p className="text-sm opacity-90">
                  {members.length} members, {onlineCount} online
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    member.id === currentUser?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Profile Avatar */}
                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                        style={{ backgroundColor: getProfileColor(member) }}
                      >
                        {getDisplayNickname(member.nickname)}
                      </div>
                      {/* Online Status Indicator */}
                      <div className="absolute -bottom-1 -right-1">
                        <div
                          className={`w-4 h-4 rounded-full border-2 border-white ${
                            member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Member Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {member.nickname}
                          {member.id === currentUser?.id && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </h3>
                      </div>
                      <p className={`text-xs ${member.isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatLastSeen(member.last_active)}
                      </p>
                    </div>

                    {/* Member Actions */}
                    <div className="flex space-x-2">
                      {member.isOnline && (
                        <>
                          <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <FaCircle size={8} className="text-green-500" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <FaCircle size={8} className="text-green-500" />
                <span>{onlineCount} online</span>
              </div>
              <div className="flex items-center space-x-1">
                <FaUsers size={12} />
                <span>{members.length} total</span>
              </div>
            </div>
            <div className="text-xs">
              Updated {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 