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
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'
import { Picker } from '@react-native-picker/picker'

export default function OnboardingScreen() {
    const { session } = useAuth()
    const [loading, setLoading] = useState(false)

    const [name, setName] = useState('')
    const [age, setAge] = useState('')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')
    const [gender, setGender] = useState('')
    const [activityLevelId, setActivityLevelId] = useState('')
    const [objectiveId, setObjectiveId] = useState('')

    const [activityLevels, setActivityLevels] = useState<any[]>([])
    const [objectives, setObjectives] = useState<any[]>([])
    const [errors, setErrors] = useState<any>({})

    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

    const validateInputs = () => {
        const newErrors: any = {}

        if (!name.trim()) {
            newErrors.name = 'El nombre es obligatorio'
        }

        if (!age.trim()) {
            newErrors.age = 'La edad es obligatoria'
        } else if (isNaN(Number(age)) || Number(age) <= 0) {
            newErrors.age = 'La edad debe ser un número válido mayor a 0'
        }

        if (!weight.trim()) {
            newErrors.weight = 'El peso es obligatorio'
        } else if (isNaN(Number(weight)) || Number(weight) <= 0) {
            newErrors.weight = 'El peso debe ser un número válido mayor a 0'
        }

        if (!height.trim()) {
            newErrors.height = 'La altura es obligatoria'
        } else if (isNaN(Number(height)) || Number(height) <= 0) {
            newErrors.height = 'La altura debe ser un número válido mayor a 0'
        }

        if (!gender) {
            newErrors.gender = 'El sexo es obligatorio'
        } else if (!['male', 'female'].includes(gender)) {
            newErrors.gender = 'El sexo debe ser válido'
        }

        if (!activityLevelId) {
            newErrors.activityLevelId = 'El nivel de actividad es obligatorio'
        } else if (isNaN(Number(activityLevelId))) {
            newErrors.activityLevelId = 'El nivel de actividad debe ser válido'
        }

        if (!objectiveId) {
            newErrors.objectiveId = 'El objetivo es obligatorio'
        } else if (isNaN(Number(objectiveId))) {
            newErrors.objectiveId = 'El objetivo debe ser válido'
        }

        return newErrors
    }

    useEffect(() => {
        if (!session) {
            router.replace('/(auth)/access')
        }
    }, [session])

    useEffect(() => {
        const getData = async () => {
            const { data: activityLevelsData, error: activityLevelsError } = await supabase.from('activity_levels').select('id, name, description')

            if(activityLevelsError) {
                Alert.alert('Error', activityLevelsError.message)
            }

            setActivityLevels(activityLevelsData || [])

            const { data: objectivesData, error: objectivesError } = await supabase.from('objectives').select('id, name, description')

            if(objectivesError) {
                Alert.alert('Error', objectivesError.message)
            }

            setObjectives(objectivesData || [])
        }

        getData()
    }, [])

    const handleSave = async () => {
        if (!session) return

        setLoading(true)

        const validationErrors = validateInputs()
        setErrors(validationErrors)

        if (Object.keys(errors).length > 0) {
            setLoading(false)
            Alert.alert('Error', 'Por favor, corrige los errores antes de continuar.')
            return
        }

        const userPayload = {
            name: name,
            age: parseInt(age),
            height_cm: parseFloat(height),
            weight_kg: parseFloat(weight),
            gender: gender,
            activity_level_id: parseInt(activityLevelId),
            objective_id: parseInt(objectiveId),
        }

        console.log('Payload del usuario:', userPayload)

        const result = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                },
            body: JSON.stringify(userPayload)
            })

        setLoading(false)

        if (!result.ok) {
            const error = await result.json()
            console.error('Error al guardar el perfil:', error)
            Alert.alert('Error', "Error al guardar el perfil")
        } else {
            Alert.alert(
                'Perfil creado',
                'Tu perfil ha sido guardado correctamente.'
            )
            router.replace('/')
        }
    }

    if (!session) return <Text>No hay sesión activa</Text>

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Completa tu perfil</Text>
            {
                Object.keys(errors).length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        {Object.entries(errors).map(([key, message]) => (
                            <Text key={key} style={{ color: 'red', fontSize: 14, marginBottom: 4, alignSelf: 'center' }}>
                                {message as string}
                            </Text>
                        ))}
                    </View>
                )
            }

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
                onValueChange={(itemValue: string) => setActivityLevelId(itemValue)}
                style={styles.input}
            >
                <Picker.Item label="Selecciona tu nivel de actividad" value="" />
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
                onValueChange={(itemValue: string) => setObjectiveId(itemValue)}
                style={styles.input}
            >
                <Picker.Item label="Selecciona tu objetivo" value="" />
                {objectives.map((objetive) => (
                    <Picker.Item
                        key={objetive.id}
                        label={objetive.name}
                        value={objetive.id.toString()}
                    />
                ))}
            </Picker>

            <Picker
                selectedValue={gender}
                onValueChange={(itemValue: string) => setGender(itemValue)}
                style={styles.input}
            >
                <Picker.Item label="Selecciona tu sexo" value="" />
                    <Picker.Item
                        key={1}
                        label={"Hombre"}
                        value={"male"}
                    />
                    <Picker.Item
                        key={1}
                        label={"Mujer"}
                        value={"female"}
                    />
            </Picker>
            {loading ? (
                <ActivityIndicator />
            ) : (
                <Button title="Guardar perfil" onPress={handleSave} />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: {
        fontSize: 22,
        marginBottom: 24,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    input: {
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontSize: 16,
    },
})
