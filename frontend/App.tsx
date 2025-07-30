import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import AuthScreen from './src/screens/AuthScreen'
import { useState } from 'react'

export default function App() {

  const [session, setSession] = useState<any>(null)

  return (
    <View style={styles.container}>
      {
        !session ? (
          <AuthScreen onAuthSuccess={(session)} />
        ) : (
          <View style={{ marginTop: 100 }}>
            <Text style={{ textAlign: 'center' }}>🎉 Bienvenido</Text>
            <Text style={{ textAlign: 'center' }}>User ID: {session.user.id}</Text>
          </View>
        )
      }
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
