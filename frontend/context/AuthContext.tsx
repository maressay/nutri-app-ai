import { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type AuthContextType = {
    session: Session | null
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
})

export function AuthProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getSession = async () => {
            const { data, error } = await supabase.auth.getSession()

            if (data?.session) setSession(data.session)
            setLoading(false)
        }

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        getSession()

        return () => {
            listener?.subscription.unsubscribe()
        }

    }, [])

    return (
        <AuthContext.Provider value={{ session, loading }}>
            {children}
        </AuthContext.Provider>
    )

}

export function useAuth() {
    return useContext(AuthContext)
}
