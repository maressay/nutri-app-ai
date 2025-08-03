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

    console.log('Session1:', session)

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

        const { error } = await supabase.from('users').insert({
            id: session.user.id,
            name,
            age: parseInt(age),
            weight_kg: parseFloat(weight),
            height_cm: parseInt(height),
            activity_level_id: parseInt(activityLevelId),
            objective_id: parseInt(objectiveId),
        })

        setLoading(false)

        if (error) {
            Alert.alert('Error', error.message)
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
                        label={level.name}
                        value={level.id.toString()}
                    />
                ))}
            </Picker>

            <Picker
                selectedValue={objectiveId}
                onValueChange={(itemValue: string) => setObjectiveId(itemValue)}
                style={styles.input}
            >
                <Picker.Item label="Selecciona tu nivel de actividad" value="" />
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
                onValueChange={(itemValue: string) => setObjectiveId(itemValue)}
                style={styles.input}
            >
                <Picker.Item label="Selecciona tu nivel de actividad" value="" />
                {objectives.map((objetive) => (
                    <Picker.Item
                        key={objetive.id}
                        label={objetive.name}
                        value={objetive.id.toString()}
                    />
                ))}
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
