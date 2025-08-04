import React, { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../context/AuthContext'

export default function AuthScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const { setSession } = useAuth()

    const handleAuth = async (mode: 'signIn' | 'signUp') => {
        setError(null)
        setLoading(true)

        const { data, error } =
            mode === 'signIn'
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password })

        if (error) {
            setError(error.message)
            return
        }

        if (mode === 'signUp') {
            // TODO: Agregar validacion de cuenta existente con el mismo correo electonico, si ya hay una cuenta con el mismo correo y verificada, no permitir el registro
            Alert.alert(
                'Éxito','¡Cuenta creada! Revisa tu correo electrónico para confirmar.'
            )
        } else if (data.session) {
            router.replace('/')
            Alert.alert('Éxito', '¡Inicio de sesión exitoso!')
        }

        setLoading(false)
    }

    return (
        <View style={styles.container}>
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
