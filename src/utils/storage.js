const NICKNAME_KEY = 'openchat-nickname'
const USER_ID_KEY = 'openchat-user-id'

export const getNickname = () => {
  return localStorage.getItem(NICKNAME_KEY)
}

export const setNickname = (nickname) => {
  localStorage.setItem(NICKNAME_KEY, nickname)
}

export const clearNickname = () => {
  localStorage.removeItem(NICKNAME_KEY)
}

export const getUserId = () => {
  return localStorage.getItem(USER_ID_KEY)
}

export const setUserId = (userId) => {
  localStorage.setItem(USER_ID_KEY, userId)
}

export const clearUserId = () => {
  localStorage.removeItem(USER_ID_KEY)
}

export const clearUserData = () => {
  clearNickname()
  clearUserId()
}

// Display only first 2 letters of nickname for privacy
export const getDisplayNickname = (nickname) => {
  if (!nickname) return ''
  return nickname.substring(0, 2).toUpperCase()
}

export const generateFileName = (nickname, extension) => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  return `${nickname}-${timestamp}-${randomId}.${extension}`
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to compress image'))
        }
      }, 'image/jpeg', quality)
    }
    
    img.src = URL.createObjectURL(file)
  })
} 