import { Ionicons } from '@expo/vector-icons'
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const initialUserData = {
    id: '',
    name: '',
    age: 0,
    weight_kg: 0,
    height_cm: 0,
    gender: '',
    activity_level: '',
    objective: '',
    required_calories: 0,
    required_protein_g: 0,
    required_fat_g: 0,
    required_carbs_g: 0,
}

export default function Profile() {
    const { session, setSession } = useAuth()
    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''
    const [userData, setUserData] = useState(initialUserData)

    function closeSession() {
        Alert.alert(
            'Cerrar sesión',
            '¿Estás seguro de que deseas cerrar sesión?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Cerrar sesión',
                    onPress: () => {
                        setSession(null)
                        router.replace('/')
                    },
                },
            ]
        )

        setSession(null)
        router.replace('/')
    }

    async function getProfileData(token: string) {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            })
            const data = await response.json()
            console.log('Datos del perfil obtenidos:', data)
            setUserData(data)
        } catch (error) {
            Alert.alert('Error al obtener los datos del perfil: ' + error)
        }
    }

    useEffect(() => {
        const token = session?.access_token
        if (!token) {
            router.replace('/')
            return
        }
        getProfileData(token)
    }, [session])

    return (
        <View style={styles.container}>
            {/* Botón atrás */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f52edff" />
                </Pressable>
                <Text style={styles.title}>Perfil del Usuario</Text>
            </View>

            {/* CARD 1 - Información básica */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Información básica</Text>
                <Text style={styles.text}>👤 Nombre: {userData.name}</Text>
                <Text style={styles.text}>🎂 Edad: {userData.age}</Text>
                <Text style={styles.text}>
                    ⚖️ Peso: {userData.weight_kg} kg
                </Text>
                <Text style={styles.text}>
                    📏 Altura: {userData.height_cm} cm
                </Text>
                <Text style={styles.text}>🚻 Género: {userData.gender}</Text>
                <Text style={styles.text}>
                    🏃 Nivel de actividad: {userData.activity_level}
                </Text>
                <Text style={styles.text}>
                    🎯 Objetivo: {userData.objective}
                </Text>

                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                        Alert.alert(
                            'Editar perfil (función aún no implementada)'
                        )
                    }
                >
                    <Text style={styles.editText}>Editar</Text>
                </TouchableOpacity>
            </View>

            {/* CARD 2 - Requerimientos nutricionales */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Requerimientos diarios</Text>
                <Text style={styles.text}>
                    🔥 Calorías: {userData.required_calories} kcal
                </Text>
                <Text style={styles.text}>
                    💪 Proteínas: {userData.required_protein_g} g
                </Text>
                <Text style={styles.text}>
                    🥑 Grasas: {userData.required_fat_g} g
                </Text>
                <Text style={styles.text}>
                    🍞 Carbohidratos: {userData.required_carbs_g} g
                </Text>
            </View>

            <TouchableOpacity
                style={styles.closeSessionButton}
                onPress={() => closeSession()}
            >
                <Text style={styles.editText}>Cerrar Sesión</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9ff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f52edff',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1f52edff',
    },
    text: {
        fontSize: 16,
        marginBottom: 4,
        color: '#333',
    },
    editButton: {
        marginTop: 10,
        alignSelf: 'flex-start',
        backgroundColor: '#1f52edff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    editText: {
        color: 'white',
        fontWeight: '600',
    },
    closeSessionButton: {
        marginTop: 10,
        alignSelf: 'center',
        backgroundColor: '#ff4d4f',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
})
