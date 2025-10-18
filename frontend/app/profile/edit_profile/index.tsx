import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { router } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'

export default function EditProfile() {
    const { session } = useAuth()
    const [loading, setLoading] = useState(false)
    const [loadingUser, setLoadingUser] = useState(true)

    // Campos del usuario
    const [name, setName] = useState('')
    const [age, setAge] = useState('')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')
    const [gender, setGender] = useState('')
    const [activityLevelId, setActivityLevelId] = useState('')
    const [objectiveId, setObjectiveId] = useState('')

    // Listas de selección
    const [activityLevels, setActivityLevels] = useState<any[]>([])
    const [objectives, setObjectives] = useState<any[]>([])

    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

    /* =============================
       1️⃣ Cargar datos del usuario actual
       ============================= */
    useEffect(() => {
        if (!session?.access_token) {
            router.replace('/(auth)/access')
            return
        }

        const fetchUserData = async () => {
            try {
                setLoadingUser(false)
                const res = await fetch(`${API_URL}/users/me`, {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })
                const data = await res.json()
                console.log('Perfil actual:', data)

                // Precargar valores
                setName(data.name || '')
                setAge(data.age?.toString() || '')
                setWeight(data.weight_kg?.toString() || '')
                setHeight(data.height_cm?.toString() || '')
                setGender(data.gender || '')
                setActivityLevelId(data.activity_level_id?.toString() || '')
                setObjectiveId(data.objective_id?.toString() || '')
                console.log(gender)
                console.log(activityLevelId)
                console.log(objectiveId)
            } catch (err) {
                Alert.alert('Error', 'No se pudo cargar el perfil actual.')
            } finally {
                setLoadingUser(false)
            }
        }

        fetchUserData()
    }, [session])

    /* =============================
       2️⃣ Cargar niveles y objetivos desde Supabase
       ============================= */
    useEffect(() => {
        const getData = async () => {
            const { data: activityLevelsData, error: activityLevelsError } =
                await supabase
                    .from('activity_levels')
                    .select('id, name, description')
            if (activityLevelsError)
                Alert.alert('Error', activityLevelsError.message)
            setActivityLevels(activityLevelsData || [])

            const { data: objectivesData, error: objectivesError } =
                await supabase
                    .from('objectives')
                    .select('id, name, description')
            if (objectivesError) Alert.alert('Error', objectivesError.message)
            setObjectives(objectivesData || [])
        }
        getData()
    }, [])

    /* =============================
       3️⃣ Guardar cambios del perfil
       ============================= */
    const handleUpdate = async () => {
        if (!session?.access_token) return
        setLoading(true)

        const userPayload = {
            name: name.trim(),
            age: parseInt(age),
            height_cm: parseFloat(height),
            weight_kg: parseFloat(weight),
            gender,
            activity_level_id: parseInt(activityLevelId),
            objective_id: parseInt(objectiveId),
        }

        try {
            const res = await fetch(`${API_URL}/users/edit_profile`, {
                method: 'PUT', // 👈 cambia a PUT o PATCH según tu backend
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(userPayload),
            })

            if (!res.ok) {
                const errTxt = await res.text()
                throw new Error(errTxt)
            }

            Alert.alert('Perfil actualizado', 'Los cambios fueron guardados.')
            router.back() // vuelve al perfil
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.message || 'No se pudo actualizar el perfil.'
            )
        } finally {
            setLoading(false)
        }
    }

    if (loadingUser) {
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: 'center', alignItems: 'center' },
                ]}
            >
                <ActivityIndicator size="large" color="#1f52edff" />
                <Text>Cargando perfil...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons
                    name="arrow-back"
                    size={24}
                    color="#1f52edff"
                    onPress={() => router.back()}
                />
                <Text style={styles.title}>Editar Perfil</Text>
            </View>

            <View style={styles.notice}>
                {/* <Ionicons
                     name="warning-outline"
                     size={20}
                     color="#B45309"
                     style={{ marginRight: 8 }}
                 /> */}
                <Text style={styles.noticeText}>
                    ⚠️ Al actualizar tu perfil, recalcularemos tus necesidades
                    diarias de calorías y macronutrientes para mantener tus
                    objetivos al día.
                </Text>
            </View>
            <TextInput
                placeholder="Nombre"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />
            <TextInput
                placeholder="Edad"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                style={styles.input}
            />
            <TextInput
                placeholder="Peso (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={styles.input}
            />
            <TextInput
                placeholder="Altura (cm)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                style={styles.input}
            />

            <Picker
                selectedValue={activityLevelId}
                onValueChange={(val) => setActivityLevelId(val)}
                style={styles.input}
            >
                <Picker.Item
                    label="Selecciona tu nivel de actividad"
                    value=""
                />
                {activityLevels.map((level) => (
                    <Picker.Item
                        key={level.id}
                        label={`${level.name} - ${level.description}`}
                        value={level.id.toString()}
                    />
                ))}
            </Picker>

            <Picker
                selectedValue={objectiveId}
                onValueChange={(val) => setObjectiveId(val)}
                style={styles.input}
            >
                <Picker.Item label="Selecciona tu objetivo" value="" />
                {objectives.map((obj) => (
                    <Picker.Item
                        key={obj.id}
                        label={obj.name}
                        value={obj.id.toString()}
                    />
                ))}
            </Picker>

            <Picker
                selectedValue={gender}
                onValueChange={(val) => setGender(val)}
                style={styles.input}
            >
                <Picker.Item label="Selecciona tu sexo" value="" />
                <Picker.Item label="Hombre" value="male" />
                <Picker.Item label="Mujer" value="female" />
            </Picker>

            {loading ? (
                <ActivityIndicator />
            ) : (
                <Button title="Guardar cambios" onPress={handleUpdate} />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8f9ff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    title: { fontSize: 20, fontWeight: '600', color: '#1f52edff' },
    input: {
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontSize: 16,
        backgroundColor: 'white',
        borderRadius: 8,
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#FEF3C7', // ámbar suave
        borderWidth: 1,
        borderColor: '#F59E0B', // ámbar
        marginBottom: 12,
    },
    noticeText: {
        flex: 1,
        color: '#92400E', // ámbar oscuro
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
})
