import React, { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native'
interface AuthScreenProps {
    onAuthSuccess: (session: Session) => void
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleAuth = async (mode: 'signIn' | 'signUp') => {
        setError(null)

        const { data, error } =
            mode === 'signIn'
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password })

        if (data.session) {
            onAuthSuccess(data.session)
            Alert.alert('✅ Autenticación exitosa')
        }
    }

    return (
        <View>
            <Text>NutriApp IA</Text>
            <TextInput
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
            />

            <TextInput
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
                title="Iniciar sesion"
                onPress={() => handleAuth('signIn')}
            ></Button>
            <View style={{ height: 12 }} />
            <Button title="Registrarse" onPress={() => handleAuth('signUp')} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    input: {
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontSize: 16,
    },
    error: {
        color: 'red',
        marginBottom: 8,
        textAlign: 'center',
    },
    title: {
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: 'bold',
    },
})
