import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://efjvspxxvmzenwcfvgbx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmanZzcHh4dm16ZW53Y2Z2Z2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDIxNjAsImV4cCI6MjA2ODMxODE2MH0.I-G5ohUrp6yHI6ARBFh_NNazmbXK_iAD7TwtuEZNrXQ'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Present' : 'Missing',
    key: supabaseAnonKey ? 'Present' : 'Missing'
  })
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 