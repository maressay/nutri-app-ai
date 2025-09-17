import {
    Alert,
    Button,
    Text,
    View,
    Modal,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import {
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'

export default function Home() {
    const { session } = useAuth()
    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

    // Estados para el flujo de analisis y previsualizacion
    console.log('Session in Home:', session?.access_token)

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [previewVisible, setPreviewVisible] = useState(false)
    const [previewUri, setPreviewUri] = useState<string | null>(null)
    const [analysis, setAnalysis] = useState<Record<string, any> | null>(null)
    const [imageFile, setImageFile] = useState<any>(null)
    const [isSavingResult, setIsSavingResult] = useState(false)
    const [recommendation, setRecommendation] = useState<string | null>(null)

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
            await sendImage(
                result.assets[0].uri,
                result.assets[0].fileName || ''
            )
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
            await sendImage(
                result.assets[0].uri,
                result.assets[0].fileName || ''
            )
        }
    }

    const sendImage = async (uri: string, originalName?: string) => {
        try {
            if (!session?.access_token) {
                Alert.alert('Sesión', 'No hay sesión activa.')
                router.replace('/')
                return
            }

            if (!API_URL) {
                Alert.alert(
                    'Config',
                    'EXPO_PUBLIC_API_URL no está configurada.'
                )
                return
            }

            setIsAnalyzing(true)

            const safeName =
                originalName && originalName.trim().length > 0
                    ? originalName
                    : `meal_${Date.now()}.jpg`

            const file: any = {
                uri,
                name: safeName,
                type: 'image/jpeg',
            }

            setImageFile(file)

            const form = new FormData()
            form.append('image', file)

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

            console.log(JSON.stringify(data, null, 2))

            setPreviewUri(uri)
            setAnalysis(data?.analysis ?? null)
            setRecommendation(data?.recommendation ?? null)

            console.log(recommendation)
            
            setPreviewVisible(true)
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo analizar la imagen')
        } finally {
            setIsAnalyzing(false) // ⬅️ importante
        }
    }

    type Alimento = {
        nombre: string
        cantidad_estimada_gramos?: number
        calorias?: number
        proteinas_g?: number
        carbohidratos_g?: number
        grasas_g?: number
    }

    const fmtNum = (n: any, digits = 0) => {
        const num = typeof n === 'string' ? Number(n) : n
        return Number.isFinite(num) ? Number(num).toFixed(digits) : '-'
    }

    const getAlimentos = (analysis: any): Alimento[] => {
        const arr = analysis?.alimentos
        return Array.isArray(arr) ? arr : []
    }

    const computeTotalsFromAlimentos = (alimentos: Alimento[]) => {
        const acc = alimentos.reduce(
            (s, a) => {
                s.calorias += a.calorias ?? 0
                s.proteinas_g += a.proteinas_g ?? 0
                s.carbohidratos_g += a.carbohidratos_g ?? 0
                s.grasas_g += a.grasas_g ?? 0
                return s
            },
            { calorias: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }
        )
        return acc
    }

    const renderRecommendation = (text: string) => {
        if (!text || text.trim().length === 0) return null
    
        return (
            <View
                style={{
                    marginTop: 4,
                    marginBottom: 10,
                    padding: 12,
                    borderColor: '#07d000ff',
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderRadius: 12
                }}
            >
                <Text
                    style={{ fontWeight: '700', fontSize: 16, marginBottom: 6 }}
                >
                    Recomendacion 👩‍⚕️
                </Text>
                <Text>{text}</Text>
            </View>
            )
    }

    const renderTotals = (alimentos: Alimento[]) => {
        if (!alimentos.length) return null
        const t = computeTotalsFromAlimentos(alimentos)
        return (
            <View
                style={{
                    marginTop: 4,
                    padding: 12,
                    backgroundColor: '#FFF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#0095ffff"
                }}
            >
                <Text
                    style={{ fontWeight: '700', fontSize: 16, marginBottom: 6 }}
                >
                    Totales estimados
                </Text>
                <Text>Calorías: {fmtNum(t.calorias)} kcal</Text>
                <Text>Proteínas: {fmtNum(t.proteinas_g)} g</Text>
                <Text>Carbohidratos: {fmtNum(t.carbohidratos_g)} g</Text>
                <Text>Grasas: {fmtNum(t.grasas_g)} g</Text>
            </View>
        )
    }

    const renderItems = (alimentos: Alimento[]) => {
        if (!alimentos.length) return null
        return (
            <View style={{ marginTop: 10 }}>
                <Text
                    style={{ fontWeight: '700', fontSize: 16, marginBottom: 6, paddingHorizontal: 12 }}
                >
                    Detalle por alimento
                </Text>
                {alimentos.map((it, idx) => (
                    <View
                        key={`${it?.nombre ?? 'alimento'}-${idx}`}
                        style={{
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            borderRadius: 12,
                            padding: 10,
                            marginBottom: 6,
                            backgroundColor: '#FFF',
                        }}
                    >
                        <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                            {it?.nombre ?? 'Alimento'}
                        </Text>
                        <Text>
                            Porción: {fmtNum(it?.cantidad_estimada_gramos)} g
                        </Text>
                        <Text>Calorías: {fmtNum(it?.calorias)} kcal</Text>
                        <Text>
                            Prot: {fmtNum(it?.proteinas_g)} g · Carb:{' '}
                            {fmtNum(it?.carbohidratos_g)} g · Grasas:{' '}
                            {fmtNum(it?.grasas_g)} g
                        </Text>
                    </View>
                ))}
            </View>
        )
    }

    const renderAnalysisBlock = () => {
        if (!analysis) return null
        const alimentos = getAlimentos(analysis)

        return (
            <View style={{ marginTop: 12 }}>
                {renderRecommendation(recommendation || "")}
                {renderTotals(alimentos)}
                {renderItems(alimentos)}
                {/* Fallback por si llega algo inesperado */}
                {!alimentos.length && (
                    <View style={{ marginTop: 10 }}>
                        <Text
                            style={{
                                fontWeight: '700',
                                fontSize: 16,
                                marginBottom: 6,
                            }}
                        >
                            Análisis (JSON)
                        </Text>
                        <ScrollView horizontal style={{ maxHeight: 180 }}>
                            <Text
                                selectable
                                style={{
                                    fontFamily: Platform.select({
                                        ios: 'Menlo',
                                        android: 'monospace',
                                    }),
                                    fontSize: 12,
                                }}
                            >
                                {JSON.stringify(analysis, null, 2)}
                            </Text>
                        </ScrollView>
                    </View>
                )}
            </View>
        )
    }

    const addNewMeal = async () => {
        Alert.alert('Nueva comida', '¿De dónde quieres obtener la imagen?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Tomar foto', onPress: takePhoto },
            { text: 'Galería', onPress: pickFromGallery },
        ])
    }

    const saveAnalysisResults = async () => {
        console.log('Guardar análisis')

        setIsSavingResult(true)

        if (!analysis || !imageFile) {
            Alert.alert('Error', 'No hay análisis o imagen para guardar.')
            return
        }

        if (!session?.access_token) {
            Alert.alert('Sesión', 'No hay sesión activa.')
            router.replace('/')
            return
        }

        if (!API_URL) {
            Alert.alert(
                'Config',
                'EXPO_PUBLIC_API_URL no está configurada.'
            )
            return
        }

        const resultFile = imageFile
        const resultAnalysis = analysis

        const form = new FormData()
        form.append('image', resultFile)
        form.append('analysis', JSON.stringify(resultAnalysis))
        form.append('recommendation', recommendation || '')

        try {
            const res = await fetch(`${API_URL}/save_analysis`, {
                method: 'post',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
                body: form,
            })

            const data = await res.json();
            setPreviewVisible(false)
            setPreviewUri(null)
            setAnalysis(null)
            setImageFile(null)
            setRecommendation(null)
            Alert.alert('Éxito', 'Análisis guardado');

        } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo guardar el análisis')
        } finally {
            setIsSavingResult(false)
        }
    }

    return (
        <>
            {isAnalyzing && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    pointerEvents="auto"
                >
                    <ActivityIndicator size="large" />
                    <Text style={{ color: '#FFF', marginTop: 8 }}>
                        Analizando imagen…
                    </Text>
                </View>
            )}

            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
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

            <Modal
                visible={previewVisible}
                animationType="slide"
                onRequestClose={() => setPreviewVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                    <View
                        style={{
                            paddingTop: 10,
                            paddingHorizontal: 16,
                            paddingBottom: 12,
                            backgroundColor: '#FFFFFF',
                            borderBottomWidth: 1,
                            borderBottomColor: '#E5E7EB',
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: '700' }}>
                            Previsualización de comida
                        </Text>
                        <Text style={{ color: '#6B7280', marginTop: 2 }}>
                            Revisa la imagen y el aporte nutricional estimado
                        </Text>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            padding: 16,
                            paddingBottom: 150,
                        }}
                    >
                        {previewUri && (
                            <Image
                                source={{ uri: previewUri }}
                                resizeMode="cover"
                                style={{
                                    width: '100%',
                                    height: 240,
                                    borderRadius: 16,
                                    backgroundColor: '#E5E7EB',
                                }}
                            />
                        )}
                        {renderAnalysisBlock()}
                    </ScrollView>

                    <View
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: '#FFFFFF',
                            borderTopWidth: 1,
                            borderTopColor: '#E5E7EB',
                            padding: 16,
                            gap: 10,
                        }}
                    >
                        {/* Por ahora no hacen nada */}
                        <Pressable
                            onPress={() => {
                                if (isSavingResult) return
                                saveAnalysisResults()
                            }}
                            style={{
                                backgroundColor: '#10B981',
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        > 
                        {
                            isSavingResult ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                            <Text
                                style={{ color: '#FFFFFF', fontWeight: '700' }}
                            >
                                Aceptar
                            </Text>
                            )
                        }
                        </Pressable>

                        <Pressable
                            onPress={() => {setPreviewVisible(false)}}
                            style={{
                                backgroundColor: '#EF4444',
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{ color: '#FFFFFF', fontWeight: '700' }}
                            >
                                Cancelar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    )
}
