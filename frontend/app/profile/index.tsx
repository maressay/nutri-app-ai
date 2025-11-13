import { Ionicons } from '@expo/vector-icons'
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    TextInput,
    Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

let initialUserData = {
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

    // 🔹 Estado para el modal de exportación
    const [exportModalVisible, setExportModalVisible] = useState(false)
    const [fromDate, setFromDate] = useState('') // YYYY-MM-DD
    const [toDate, setToDate] = useState('')     // YYYY-MM-DD
    const [isExporting, setIsExporting] = useState(false)

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
            initialUserData = data
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

    // 🔹 Helper para descargar historial (todo o rango)
    async function handleExportHistory(all: boolean) {
        if (!session?.access_token) return
        if (!API_URL) {
            Alert.alert('Error', 'API_URL no está configurada.')
            return
        }

        if (!all && !fromDate && !toDate) {
            Alert.alert(
                'Rango vacío',
                'Ingresa al menos una fecha (Desde o Hasta, formato YYYY-MM-DD).'
            )
            return
        }

        try {
            setIsExporting(true)

            const params = new URLSearchParams()
            params.append('format', 'xlsx')

            if (!all) {
                if (fromDate) params.append('from_date', fromDate)
                if (toDate) params.append('to_date', toDate)
            }

            const url = `${API_URL}/meals/export_history?${params.toString()}`
            const suffix = all ? 'all' : 'range'

            if (Platform.OS === 'web') {
                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`)
                }

                const blob = await res.blob()
                const downloadUrl = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = downloadUrl
                a.download = `nutriapp_meals_${suffix}.xlsx`
                document.body.appendChild(a)
                a.click()
                a.remove()
                window.URL.revokeObjectURL(downloadUrl)
            } else {
                const fileUri =
                    FileSystem.documentDirectory +
                    `nutriapp_meals_${suffix}.xlsx`

                const { uri } = await FileSystem.downloadAsync(url, fileUri, {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })

                const canShare = await Sharing.isAvailableAsync()
                if (canShare) {
                    await Sharing.shareAsync(uri)
                } else {
                    Alert.alert(
                        'Archivo descargado',
                        `Guardado en: ${uri}`
                    )
                }
            }

            setExportModalVisible(false)
        } catch (err) {
            console.error(err)
            Alert.alert('Error', 'No se pudo generar el reporte.')
        } finally {
            setIsExporting(false)
        }
    }

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
                    onPress={() => router.push('/profile/edit_profile')}
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

            {/* 🔹 Botón para abrir modal de exportación */}
            <TouchableOpacity
                style={styles.exportButton}
                onPress={() => setExportModalVisible(true)}
            >
                <Text style={styles.exportText}>
                    Exportar historial de comidas
                </Text>
            </TouchableOpacity>

            {/* Botón cerrar sesión */}
            <TouchableOpacity
                style={styles.closeSessionButton}
                onPress={() => closeSession()}
            >
                <Text style={styles.editText}>Cerrar Sesión</Text>
            </TouchableOpacity>

            {/* 🔹 Modal de exportación */}
            <Modal
                visible={exportModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setExportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Exportar historial
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            Puedes exportar todo el historial o solo un rango de
                            fechas.
                        </Text>

                        <Text style={styles.modalLabel}>Desde (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={fromDate}
                            onChangeText={setFromDate}
                            placeholder="Ej: 2025-01-01"
                            autoCapitalize="none"
                        />

                        <Text style={styles.modalLabel}>Hasta (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={toDate}
                            onChangeText={setToDate}
                            placeholder="Ej: 2025-01-31"
                            autoCapitalize="none"
                        />

                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: '#1f52edff' },
                                ]}
                                disabled={isExporting}
                                onPress={() => handleExportHistory(false)}
                            >
                                <Text style={styles.modalButtonText}>
                                    {isExporting
                                        ? 'Exportando...'
                                        : 'Exportar rango'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: '#10b981' },
                                ]}
                                disabled={isExporting}
                                onPress={() => handleExportHistory(true)}
                            >
                                <Text style={styles.modalButtonText}>
                                    {isExporting
                                        ? 'Exportando...'
                                        : 'Todo el historial'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                { backgroundColor: '#94a3b8', marginTop: 8 },
                            ]}
                            disabled={isExporting}
                            onPress={() => setExportModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    // 🔹 estilos extra para exportación
    exportButton: {
        marginTop: 10,
        alignSelf: 'center',
        backgroundColor: '#1f2937',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    exportText: {
        color: 'white',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 12,
    },
    modalLabel: {
        fontSize: 14,
        color: '#374151',
        marginTop: 8,
        marginBottom: 4,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 14,
        backgroundColor: '#f9fafb',
    },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
})
