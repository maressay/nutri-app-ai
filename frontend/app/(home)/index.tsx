import { Alert, Button, Text, View } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import {
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker'
import { router } from 'expo-router'

export default function Home() {
    const { session } = useAuth()
    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

    const takePhoto = async () => {
        const { status } = await requestCameraPermissionsAsync()

        if (status !== 'granted') {
            Alert.alert(
                'Permiso requerido',
                'Necesitas habilitar acceso a la cámara.'
            )
            return
        }

        const result = await launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.9,
        })

        if (!result.canceled) {
            console.log('Foto tomada', result.assets[0].uri)
            await sendImage(result.assets[0].uri, result.assets[0].fileName || '')
        }
    }

    const pickFromGallery = async () => {
        const { status } = await requestMediaLibraryPermissionsAsync()

        if (status !== 'granted') {
            Alert.alert(
                'Permiso requerido',
                'Necesitas habilitar acceso a la galería.'
            )
            return
        }

        const result = await launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.9,
        })

        if (!result.canceled) {
            console.log('Imagen seleccionada', result.assets[0].uri)
            await sendImage(result.assets[0].uri, result.assets[0].fileName || '')
        }
    }

    const sendImage = async (uri: string, originalName?: string) => {
        try {
            if (!session?.access_token) {
                Alert.alert('Sesión', 'No hay sesión activa.')
                router.replace('/')
                return
            }

            const name = originalName + `meal_${Date.now()}.jpg`
            const file: any = {
                uri,
                name,
                type: 'image/jpeg',
            }

            const form = new FormData()
            form.append('image', file)

            Alert.alert(`${API_URL}/analyse_meal`)

            const res = await fetch(`${API_URL}/analyse_meal`, {
                method: 'post',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
                body: form,
            })

            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`Error ${res.status}: ${txt}`)
            }

            const data = await res.json()

            console.log('Analisis', data.analysis)
            Alert.alert(
                'Análisis listo',
                JSON.stringify(data.analysis, null, 2)
            )
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo analizar la imagen')
        }
    }

    const addNewMeal = async () => {
        Alert.alert('Nueva comida', '¿De dónde quieres obtener la imagen?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Tomar foto', onPress: takePhoto },
            { text: 'Galería', onPress: pickFromGallery },
        ])
    }

    return (
        <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
            <Text>Bienvenido a Nutri APP</Text>
            {session && <Text>User ID: {session.user.id}</Text>}
            <Ionicons
                name="add-circle"
                size={70}
                color={'#0090FF'}
                style={{ position: 'absolute', bottom: 10 }}
                onPress={addNewMeal}
            />
        </View>
    )
}
