// app/(tabs)/index.tsx
import {
    Alert,
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
    Platform,
    Button,
    TextInput,
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import {
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    requestMediaLibraryPermissionsAsync,
    MediaTypeOptions,
} from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'

/* ---------- Tipos ---------- */
type UserInfo = {
    id: string
    name?: string
    age?: number
    height_cm?: number
    weight_kg?: number
    gender?: string
    required_calories?: number
    required_protein_g?: number | string
    required_fat_g?: number | string
    required_carbs_g?: number | string
    activity_level?: string | null
    objective?: string | null
}

type Alimento = {
    nombre: string
    cantidad_estimada_gramos?: number
    calorias?: number
    proteinas_g?: number
    carbohidratos_g?: number
    grasas_g?: number
}

/* ---------- Tarjeta blanco/azul (sin IDs) ---------- */
function UserCard({ user }: { user: UserInfo }) {
    const Row = ({ label, value }: { label: string; value: any }) => {
        if (value === undefined || value === null || value === '') return null
        return (
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: '#D7E9FF',
                    marginTop: 6,
                }}
            >
                <Text style={{ color: 'rgb(31, 82, 237)', fontWeight: '600' }}>
                    {label}
                </Text>
                <Text
                    style={{
                        color: '#111827',
                        fontWeight: '500',
                        maxWidth: '55%',
                        textAlign: 'right',
                    }}
                >
                    {String(value)}
                </Text>
            </View>
        )
    }

    return (
        <View
            style={{
                width: '92%',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#0090FF',
                padding: 14,
                gap: 8,
                alignSelf: 'center',
                marginTop: 12,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
            }}
        >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0A66C2' }}>
                Tu perfil nutricional
            </Text>

            <Text style={{ marginTop: 4, color: '#0A66C2', fontWeight: '700' }}>
                Datos básicos
            </Text>
            <Row label="Nombre" value={user.name} />
            <Row label="Género" value={user.gender} />
            <Row label="Edad" value={user.age} />
            <Row label="Talla (cm)" value={user.height_cm} />
            <Row label="Peso (kg)" value={user.weight_kg} />

            <Text
                style={{ marginTop: 10, color: '#0A66C2', fontWeight: '700' }}
            >
                Actividad y objetivo
            </Text>
            <Row label="Nivel de actividad" value={user.activity_level} />
            <Row label="Objetivo" value={user.objective} />

            <Text
                style={{ marginTop: 10, color: '#0A66C2', fontWeight: '700' }}
            >
                Objetivos diarios
            </Text>
            <Row label="Calorías (kcal)" value={user.required_calories} />
            <Row label="Proteína (g)" value={user.required_protein_g} />
            <Row label="Carbohidratos (g)" value={user.required_carbs_g} />
            <Row label="Grasas (g)" value={user.required_fat_g} />
        </View>
    )
}

/* ---------- Componente principal ---------- */
export default function Home() {
    const { session } = useAuth()
    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [previewVisible, setPreviewVisible] = useState(false)
    const [previewUri, setPreviewUri] = useState<string | null>(null)
    const [analysis, setAnalysis] = useState<Record<string, any> | null>(null)
    const [imageFile, setImageFile] = useState<any>(null)
    const [isSavingResult, setIsSavingResult] = useState(false)
    const [recommendation, setRecommendation] = useState<string | null>(null)

    // /users/me
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [loadingUser, setLoadingUser] = useState(false)
    const [userErr, setUserErr] = useState<string | null>(null)

    // Web
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    /* ----- Cargar /users/me ----- */
    const getInfo = async () => {
        if (!session?.access_token) {
            Alert.alert('Sesión', 'No hay sesión activa.')
            router.replace('/')
            return
        }
        if (!API_URL) {
            Alert.alert('Config', 'EXPO_PUBLIC_API_URL no está configurada.')
            return
        }
        try {
            setLoadingUser(true)
            setUserErr(null)

            const res = await fetch(`${API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`Error ${res.status}: ${txt}`)
            }

            const data = (await res.json()) as UserInfo
            setUserInfo(data)
        } catch (e: any) {
            setUserErr(e?.message ?? 'No se pudo obtener el usuario')
        } finally {
            setLoadingUser(false)
        }
    }

    useEffect(() => {
        getInfo()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.access_token, API_URL])

    /* ----- Cámara / Galería / Análisis ----- */
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
            mediaTypes: MediaTypeOptions.Images,
            quality: 0.9,
        })
        if (!result.canceled) {
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
            mediaTypes: MediaTypeOptions.Images,
            quality: 0.9,
        })
        if (!result.canceled) {
            await sendImage(
                result.assets[0].uri,
                result.assets[0].fileName || ''
            )
        }
    }

    const sendImage = async (uri: string, originalName?: string) => {
        console.log(uri, originalName)
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
            setIsAnalyzing(true) // abre el Modal

            const safeName =
                originalName && originalName.trim().length > 0
                    ? originalName
                    : `meal_${Date.now()}.jpg`

            const file: any = { uri, name: safeName, type: 'image/jpeg' }
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
            setPreviewUri(uri)
            setAnalysis(data?.analysis ?? null)
            setRecommendation(data?.recommendation ?? null)
            setPreviewVisible(true)
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo analizar la imagen')
        } finally {
            setIsAnalyzing(false) // cierra el Modal
        }
    }

    const sendImageWeb = async (file: File) => {
        setImageFile(file)
        setIsAnalyzing(true)

        const form = new FormData()
        form.append('image', file)
        try {
            const res = await fetch(`${API_URL}/analyse_meal`, {
                method: 'post',
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    Accept: 'application/json',
                },
                body: form,
            })

            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`Error ${res.status}: ${txt}`)
            }
            const data = await res.json()

            // Verificar que 'analysis' exista y que el array 'alimentos' contenga elementos
            if (
                data?.analysis == null ||
                !Array.isArray(data.analysis?.alimentos) ||
                data.analysis.alimentos.length === 0
            ) {
                Alert.alert('Error', 'No se detectaron alimentos en la imagen.')
                alert("No se detectaron alimentos en la imagen.")
                throw new Error('No se detectaron alimentos en la imagen.')
            }

            setPreviewUri(URL.createObjectURL(file))
            setAnalysis(data?.analysis ?? null)
            setRecommendation(data?.recommendation ?? null)
            setPreviewVisible(true)
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo analizar la imagen')
        } finally {
            setIsAnalyzing(false) // cierra el Modal
        }
    }

    const handleWebFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0]
        if (file) {
            await sendImageWeb(file)
        }
    }

    /* ----- Utilidades de análisis ----- */
    const fmtNum = (n: any, d = 0) => {
        const num = typeof n === 'string' ? Number(n) : n
        return Number.isFinite(num) ? Number(num).toFixed(d) : '-'
    }

    const getAlimentos = (a: any): Alimento[] =>
        Array.isArray(a?.alimentos) ? a.alimentos : []

    const computeTotals = (als: Alimento[]) =>
        als.reduce(
            (s, a) => ({
                calorias: s.calorias + (a.calorias ?? 0),
                proteinas_g: s.proteinas_g + (a.proteinas_g ?? 0),
                carbohidratos_g: s.carbohidratos_g + (a.carbohidratos_g ?? 0),
                grasas_g: s.grasas_g + (a.grasas_g ?? 0),
            }),
            { calorias: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }
        )

    const renderRecommendation = (text: string) =>
        !text?.trim() ? null : (
            <View
                style={{
                    marginTop: 4,
                    marginBottom: 10,
                    padding: 12,
                    borderColor: '#07d000ff',
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderRadius: 12,
                }}
            >
                <Text
                    style={{ fontWeight: '700', fontSize: 16, marginBottom: 6 }}
                >
                    Recomendación 👩‍⚕️
                </Text>
                <Text>{text}</Text>
            </View>
        )

    const renderTotals = (als: Alimento[]) => {
        if (!als.length) return null
        const t = computeTotals(als)
        return (
            <View
                style={{
                    marginTop: 4,
                    padding: 12,
                    backgroundColor: '#FFF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#0095ffff',
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

    const renderItems = (als: Alimento[]) =>
        !als.length ? null : (
            <View style={{ marginTop: 10 }}>
                <Text
                    style={{
                        fontWeight: '700',
                        fontSize: 16,
                        marginBottom: 6,
                        paddingHorizontal: 12,
                    }}
                >
                    Detalle por alimento
                </Text>
                {als.map((it, idx) => (
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
                        <Text
                            style={{
                                fontWeight: '600',
                                textTransform: 'capitalize',
                            }}
                        >
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

    const renderAnalysisBlock = () => {
        if (!analysis) return null
        const alimentos = getAlimentos(analysis)
        return (
            <View style={{ marginTop: 12 }}>
                {renderRecommendation(recommendation || '')}
                {renderTotals(alimentos)}
                {renderItems(alimentos)}
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
        setIsSavingResult(true)

        if (!analysis || !imageFile) {
            Alert.alert('Error', 'No hay análisis o imagen para guardar.')
            setIsSavingResult(false)
            return
        }
        if (!session?.access_token) {
            Alert.alert('Sesión', 'No hay sesión activa.')
            router.replace('/')
            setIsSavingResult(false)
            return
        }
        if (!API_URL) {
            Alert.alert('Config', 'EXPO_PUBLIC_API_URL no está configurada.')
            setIsSavingResult(false)
            return
        }

        const form = new FormData()
        form.append('image', imageFile)
        form.append('analysis', JSON.stringify(analysis))
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

            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`Error ${res.status}: ${txt}`)
            }

            await res.json()
            setPreviewVisible(false)
            setPreviewUri(null)
            setAnalysis(null)
            setImageFile(null)
            setRecommendation(null)
            setIsAnalyzing(false)
            Alert.alert('Éxito', 'Análisis guardado')

            getInfo()
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo guardar el análisis')
        } finally {
            setPreviewVisible(false)
            setIsSavingResult(false)
            setIsAnalyzing(false)
        }
    }

    return (
        <>
            {/* overlay de análisis como MODAL (siempre al frente) */}
            <Modal
                visible={isAnalyzing}
                transparent
                animationType="fade"
                statusBarTranslucent={Platform.OS === 'android'}
                presentationStyle={
                    Platform.OS === 'ios' ? 'overFullScreen' : undefined
                }
                onRequestClose={() => {}}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // por si alguna vez lo cambias a View normal:
                        zIndex: 9999,
                        ...(Platform.OS === 'android'
                            ? { elevation: 9999 }
                            : null),
                    }}
                    pointerEvents="auto"
                >
                    <View
                        style={{
                            backgroundColor: '#111827',
                            paddingVertical: 18,
                            paddingHorizontal: 22,
                            borderRadius: 14,
                            alignItems: 'center',
                            minWidth: 220,
                        }}
                    >
                        <ActivityIndicator size="large" />
                        <Text
                            style={{
                                color: '#FFF',
                                marginTop: 10,
                                fontWeight: '700',
                            }}
                        >
                            Analizando imagen…
                        </Text>
                        <Text
                            style={{
                                color: '#D1D5DB',
                                marginTop: 4,
                                fontSize: 12,
                            }}
                        >
                            Esto puede tomar unos segundos
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* pantalla principal */}
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <View
                    style={{
                        backgroundColor: '#fff',
                        zIndex: 1000,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        marginBottom: Platform.OS === 'android' ? 10 : 10,
                        boxShadow: '0 0px 15px rgba(0,0,0,0.1)',
                    }}
                >
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: 'rgb(31, 82, 237)',
                        }}
                    >
                        NutriApp
                    </Text>
                    <Ionicons
                        name="person-circle"
                        size={40}
                        color={'rgb(31, 82, 237)'}
                        style={{ margin: 3 }}
                        title="Ir al perfil"
                        onPress={() => {
                            router.push('../profile')
                        }}
                    />
                </View>
                <ScrollView
                    contentContainerStyle={{
                        paddingTop: 16,
                        paddingBottom: 120,
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: '700' }}>
                        Bienvenido {userInfo?.name || 'Usuario'}
                    </Text>
                    {session && (
                        <Text style={{ color: '#000' }}>
                            Session: {session.user.id}
                        </Text>
                    )}

                    {loadingUser ? (
                        <ActivityIndicator />
                    ) : userErr ? (
                        <Text style={{ color: '#EF4444' }}>{userErr}</Text>
                    ) : userInfo ? (
                        // <UserCard user={userInfo} />
                        <Text></Text>
                    ) : (
                        <Text style={{ color: '#6B7280' }}>
                            Aún no hay datos de usuario.
                        </Text>
                    )}
                </ScrollView>

                {/* botón flotante */}
                <Ionicons
                    name="add-circle"
                    size={70}
                    color={'#0090FF'}
                    style={{
                        position: 'absolute',
                        bottom: 10,
                        alignSelf: 'center',
                    }}
                    onPress={() => {
                        if (Platform.OS === 'web') fileInputRef.current?.click()
                        if (Platform.OS !== 'web') addNewMeal()
                    }}
                />
                {Platform.OS === 'web' && (
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        capture="environment"
                        onChange={handleWebFileChange}
                    />
                )}
            </View>

            {/* modal de previsualización */}
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
                        <Pressable
                            onPress={() => {
                                if (!isSavingResult) saveAnalysisResults()
                            }}
                            style={{
                                backgroundColor: '#10B981',
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            {isSavingResult ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text
                                    style={{
                                        color: '#FFFFFF',
                                        fontWeight: '700',
                                    }}
                                >
                                    Aceptar
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                setPreviewVisible(false)
                                setIsAnalyzing(false)
                            }}
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
