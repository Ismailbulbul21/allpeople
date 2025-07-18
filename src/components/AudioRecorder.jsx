import React, { useState, useRef, useEffect } from 'react'
import { FaMicrophone, FaStop, FaPlay, FaPause } from 'react-icons/fa'

export const AudioRecorder = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorderRef = useRef(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      })
      
      const chunks = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const sendRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob)
      setAudioBlob(null)
      setRecordingTime(0)
    }
  }

  const discardRecording = () => {
    setAudioBlob(null)
    setRecordingTime(0)
    setIsPlaying(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <audio
          ref={audioRef}
          src={URL.createObjectURL(audioBlob)}
          onEnded={() => setIsPlaying(false)}
        />
        <button
          onClick={playRecording}
          className="p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
        >
          {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatTime(recordingTime)}
        </span>
        <button
          onClick={sendRecording}
          className="btn-primary text-sm px-3 py-1"
        >
          Send
        </button>
        <button
          onClick={discardRecording}
          className="btn-secondary text-sm px-3 py-1"
        >
          Discard
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <>
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors animate-pulse"
          >
            <FaStop size={16} />
          </button>
          <span className="text-sm text-red-600 dark:text-red-400">
            Recording... {formatTime(recordingTime)}
          </span>
        </>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Record voice message"
        >
          <FaMicrophone size={16} />
        </button>
      )}
    </div>
  )
} 