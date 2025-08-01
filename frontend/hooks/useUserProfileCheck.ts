import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useUserProfileCheck() {
  const { session } = useAuth()
  const [checking, setChecking] = useState(true)
  const [hasUserProfile, setHasUserProfile] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkProfile = async () => {
      if (!session) return

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('❌ Error checking user profile:', error)
        setError(error.message)
        setHasUserProfile(false)
      } else {
        setHasUserProfile(!!data)
      }

      setChecking(false)
    }

    checkProfile()
  }, [session])

  return { hasUserProfile, checking, error }
}
