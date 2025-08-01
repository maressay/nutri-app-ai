import { Redirect, router } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { ActivityIndicator, View } from 'react-native'
import { useUserProfileCheck } from '../hooks/useUserProfileCheck'

export default function Index() {
    const { session, loading } = useAuth()
    const { hasUserProfile, checking } = useUserProfileCheck()

    if (loading || (session && checking)) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <ActivityIndicator size="large" />
            </View>
        )
    }
    if (!session) return <Redirect href="/(auth)/access" />
    if (!hasUserProfile) return <Redirect href="/(auth)/onboarding" />
    return <Redirect href={'/(home)'}></Redirect>
}
