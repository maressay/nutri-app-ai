// app/(tabs)/index.tsx — layout actualizado según mock: header, 2 cards (actividad/objetivo),
// sección de barras con filtro de fecha, y listado clickable de comidas
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    requestMediaLibraryPermissionsAsync,
    MediaTypeOptions,
} from 'expo-image-picker'
import { useAuth } from '../../context/AuthContext'

/* ---------- Tipos ---------- */
export type UserInfo = {
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

export type Alimento = {
    nombre: string
    cantidad_estimada_gramos?: number
    calorias?: number
    proteinas_g?: number
    carbohidratos_g?: number
    grasas_g?: number
}

export type Analysis = {
    alimentos?: Alimento[]
    [k: string]: any
}

export type AnalysisResponse = {
    analysis: Analysis | null
    recommendation?: string | null
}

// Tipos para archivo de imagen (nativo / web)
export type NativeImageFile = { uri: string; name: string; type: string }
export type WebImageFile = File
export type ImageFile = NativeImageFile | WebImageFile

export type DayTotals = {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
}

export type DayTargets = {
    required_calories?: number | string | null
    required_protein_g?: number | string | null
    required_fat_g?: number | string | null
    required_carbs_g?: number | string | null
    objective_id?: string | null
    activity_level_id?: string | null
}

export type DayMeal = {
    id: string
    user_id: string
    date_creation: string
    img_url?: string | null
    recommendation?: string | null
    total_calories?: number | null
    total_carbs_g?: number | null
    total_fat_g?: number | null
    total_protein_g?: number | null
}

export type DaySummary = {
    date: string
    timezone: string
    targets: DayTargets
    totals: DayTotals
    meals_count: number
    meals: DayMeal[]
}

const fmtNum = (n: any, d = 0) => {
    const num = typeof n === 'string' ? Number(n) : n
    return Number.isFinite(num) ? Number(num).toFixed(d) : '-'
}
const num = (v: any, dflt = 0): number => {
    const n = typeof v === 'string' ? parseFloat(v) : v
    return Number.isFinite(n) ? Number(n) : dflt
}
const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v))
const pad = (n: number) => String(n).padStart(2, '0')
const toYMD = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d: Date, days: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
const parseYMD = (s: string) => {
    const [y, m, d] = s.split('-').map((x) => parseInt(x, 10))
    return new Date(y, (m || 1) - 1, d || 1)
}
const fmtHour = (iso: string) => {
    const d = new Date(iso)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const getAlimentos = (a: Analysis | null | undefined): Alimento[] =>
    Array.isArray(a?.alimentos) ? (a!.alimentos as Alimento[]) : []

const computeTotalsFromAlimentos = (als: Alimento[]) =>
    als.reduce(
        (s, a) => ({
            calorias: s.calorias + (a.calorias ?? 0),
            proteinas_g: s.proteinas_g + (a.proteinas_g ?? 0),
            carbohidratos_g: s.carbohidratos_g + (a.carbohidratos_g ?? 0),
            grasas_g: s.grasas_g + (a.grasas_g ?? 0),
        }),
        { calorias: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }
    )

/* ---------- UI piezas ---------- */
function ProgressRow({
    label,
    unit,
    current,
    target,
}: {
    label: string
    unit: string
    current: number
    target: number
}) {
    const pct = target > 0 ? (current / target) * 100 : 0
    const pctDisplay = clamp(pct, 0, 100)
    const pctClamped = pctDisplay
    const over = target > 0 && current > target
    return (
        <View style={{ marginTop: 10 }}>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                }}
            >
                <Text style={{ fontWeight: '600' }}>{label}</Text>
                <Text style={{ color: '#111827' }}>
                    {fmtNum(current)}
                    {unit} / {fmtNum(target)}
                    {unit} ({fmtNum(pctDisplay, 0)}%)
                </Text>
            </View>
            <View
                style={{
                    height: 14,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 999,
                }}
            >
                <View
                    style={{
                        height: 14,
                        width: `${pctClamped}%`,
                        backgroundColor: over ? '#EF4444' : '#10B981',
                        borderRadius: 999,
                    }}
                />
            </View>
        </View>
    )
}

function InfoCard({ title, value }: { title: string; value?: string | null }) {
    return (
        <View
            style={{
                flex: 1,
                minWidth: 180,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#D7E9FF',
                borderRadius: 12,
                padding: 12,
            }}
        >
            <Text style={{ color: '#0A66C2', fontWeight: '700' }}>{title}</Text>
            <Text style={{ marginTop: 6 }}>{value || '-'}</Text>
        </View>
    )
}

function MealMiniCard({ item }: { item: DayMeal }) {
    const hasImg = !!item.img_url
    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: '/(home)/history/meal/[id]',
                    params: { id: item.id },
                })
            }
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFF',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                padding: 10,
                marginBottom: 8,
            }}
        >
            {hasImg ? (
                <Image
                    source={{ uri: item.img_url! }}
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        backgroundColor: '#E5E7EB',
                    }}
                />
            ) : (
                <View
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        backgroundColor: '#E5E7EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="fast-food" size={24} color="#9CA3AF" />
                </View>
            )}
            <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>
                    Comida · {fmtHour(item.date_creation)}
                </Text>
                <Text
                    style={{ color: '#6B7280', marginTop: 2 }}
                    numberOfLines={1}
                >
                    {item.recommendation || '—'}
                </Text>
                <Text style={{ marginTop: 4 }}>
                    {fmtNum(item.total_protein_g || 0)}g P ·{' '}
                    {fmtNum(item.total_carbs_g || 0)}g C ·{' '}
                    {fmtNum(item.total_fat_g || 0)}g G ·{' '}
                    {fmtNum(item.total_calories || 0)} kcal
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>
    )
}

/* ---------- Main ---------- */
export default function Home() {
    const { session } = useAuth()
    const API_URL = useMemo(() => process.env.EXPO_PUBLIC_API_URL || '', [])

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [previewVisible, setPreviewVisible] = useState(false)
    const [previewUri, setPreviewUri] = useState<string | null>(null)
    const [analysis, setAnalysis] = useState<Analysis | null>(null)
    const [imageFile, setImageFile] = useState<ImageFile | null>(null)
    const [isSavingResult, setIsSavingResult] = useState(false)
    const [recommendation, setRecommendation] = useState<string | null>(null)

    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [loadingUser, setLoadingUser] = useState(false)
    const [userErr, setUserErr] = useState<string | null>(null)

    // Progreso y comidas del día
    const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()))
    const [daySummary, setDaySummary] = useState<DaySummary | null>(null)
    const [loadingDay, setLoadingDay] = useState(false)
    const [dayErr, setDayErr] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement | null>(null)

    /* ----- Cargar /users/me ----- */
    const getInfo = useCallback(async () => {
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
            if (!res.ok)
                throw new Error(`Error ${res.status}: ${await res.text()}`)
            const data = (await res.json()) as UserInfo
            setUserInfo(data)
        } catch (e: any) {
            setUserErr(e?.message ?? 'No se pudo obtener el usuario')
        } finally {
            setLoadingUser(false)
        }
    }, [API_URL, session?.access_token])

    useEffect(() => {
        getInfo()
    }, [getInfo])

    /* ----- Cargar /meals/day ----- */
    const loadDaySummary = useCallback(
        async (d: string) => {
            if (!session?.access_token || !API_URL) return
            try {
                setLoadingDay(true)
                setDayErr(null)
                const res = await fetch(
                    `${API_URL}/meals/day?date=${encodeURIComponent(d)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    }
                )
                if (!res.ok)
                    throw new Error(`Error ${res.status}: ${await res.text()}`)
                const data = (await res.json()) as DaySummary
                setDaySummary(data)
            } catch (e: any) {
                setDayErr(e?.message || 'No se pudo cargar el resumen diario')
            } finally {
                setLoadingDay(false)
            }
        },
        [API_URL, session?.access_token]
    )

    useEffect(() => {
        loadDaySummary(selectedDate)
    }, [loadDaySummary, selectedDate])

    const goPrevDay = useCallback(
        () => setSelectedDate((s) => toYMD(addDays(parseYMD(s), -1))),
        []
    )
    const goNextDay = useCallback(
        () => setSelectedDate((s) => toYMD(addDays(parseYMD(s), 1))),
        []
    )
    const onDateInputChange = useCallback((e: any) => {
        const v = e?.target?.value
        if (v) setSelectedDate(v)
    }, [])

    /* ----- Cámara / Galería / Análisis ----- */
    const takePhoto = useCallback(async () => {
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
        if (!result.canceled)
            await sendImage(
                result.assets[0].uri,
                result.assets[0].fileName || ''
            )
    }, [])

    const pickFromGallery = useCallback(async () => {
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
        if (!result.canceled)
            await sendImage(
                result.assets[0].uri,
                result.assets[0].fileName || ''
            )
    }, [])

    const validateAnalysis = (data: AnalysisResponse) => {
        const alimentos = getAlimentos(data?.analysis)
        if (!alimentos.length)
            throw new Error('No se detectaron alimentos en la imagen.')
    }

    const sendImage = useCallback(
        async (uri: string, originalName?: string) => {
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
                const safeName = originalName?.trim()?.length
                    ? originalName
                    : `meal_${Date.now()}.jpg`
                const file: NativeImageFile = {
                    uri,
                    name: safeName,
                    type: 'image/jpeg',
                }
                setImageFile(file)
                const form = new FormData()
                // @ts-ignore RN acepta { uri, name, type }
                form.append('image', file as any)
                const res = await fetch(`${API_URL}/analyse_meal`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        Accept: 'application/json',
                    },
                    body: form,
                })
                if (!res.ok)
                    throw new Error(`Error ${res.status}: ${await res.text()}`)
                const data = (await res.json()) as AnalysisResponse
                validateAnalysis(data)
                setPreviewUri(uri)
                setAnalysis(data?.analysis ?? null)
                setRecommendation(data?.recommendation ?? null)
                setPreviewVisible(true)
            } catch (e: any) {
                Alert.alert(
                    'Error',
                    e?.message || 'No se pudo analizar la imagen'
                )
            } finally {
                setIsAnalyzing(false)
            }
        },
        [API_URL, session?.access_token]
    )

    const sendImageWeb = useCallback(
        async (file: File) => {
            try {
                if (!API_URL) {
                    Alert.alert(
                        'Config',
                        'EXPO_PUBLIC_API_URL no está configurada.'
                    )
                    return
                }
                setImageFile(file)
                setIsAnalyzing(true)
                if (!file.type?.startsWith('image/'))
                    throw new Error('El archivo debe ser una imagen.')
                const form = new FormData()
                form.append('image', file)
                const res = await fetch(`${API_URL}/analyse_meal`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                        Accept: 'application/json',
                    },
                    body: form,
                })
                if (!res.ok)
                    throw new Error(`Error ${res.status}: ${await res.text()}`)
                const data = (await res.json()) as AnalysisResponse
                validateAnalysis(data)
                const url = URL.createObjectURL(file)
                setPreviewUri(url)
                setAnalysis(data?.analysis ?? null)
                setRecommendation(data?.recommendation ?? null)
                setPreviewVisible(true)
            } catch (e: any) {
                Alert.alert(
                    'Error',
                    e?.message || 'No se pudo analizar la imagen'
                )
            } finally {
                setIsAnalyzing(false)
            }
        },
        [API_URL, session?.access_token]
    )

    const handleWebFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) await sendImageWeb(file)
        },
        [sendImageWeb]
    )

    const clearPreview = useCallback(() => {
        setPreviewVisible(false)
        setIsAnalyzing(false)
        if (
            previewUri &&
            previewUri.startsWith('blob:') &&
            typeof URL !== 'undefined'
        ) {
            try {
                URL.revokeObjectURL(previewUri)
            } catch {}
        }
    }, [previewUri])

    const saveAnalysisResults = useCallback(async () => {
        setIsSavingResult(true)
        try {
            if (!analysis || !imageFile)
                throw new Error('No hay análisis o imagen para guardar.')
            if (!session?.access_token) {
                Alert.alert('Sesión', 'No hay sesión activa.')
                router.replace('/')
                return
            }
            if (!API_URL)
                throw new Error('EXPO_PUBLIC_API_URL no está configurada.')
            const form = new FormData()
            // @ts-ignore
            form.append('image', imageFile as any)
            form.append('analysis', JSON.stringify(analysis))
            form.append('recommendation', recommendation || '')
            const res = await fetch(`${API_URL}/save_analysis`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
                body: form,
            })
            if (!res.ok)
                throw new Error(`Error ${res.status}: ${await res.text()}`)
            setPreviewVisible(false)
            setPreviewUri(null)
            setAnalysis(null)
            setImageFile(null)
            setRecommendation(null)
            setIsAnalyzing(false)
            Alert.alert('Éxito', 'Análisis guardado')
            // recargar progreso del día
            loadDaySummary(selectedDate)
            getInfo()
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo guardar el análisis')
        } finally {
            setPreviewVisible(false)
            setIsSavingResult(false)
            setIsAnalyzing(false)
        }
    }, [
        API_URL,
        analysis,
        getInfo,
        imageFile,
        recommendation,
        selectedDate,
        loadDaySummary,
        session?.access_token,
    ])

    /* ---------- Render ---------- */
    return (
        <>
            {/* Overlay de análisis */}
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
                        zIndex: 9999,
                        ...(Platform.OS === 'android'
                            ? { elevation: 9999 }
                            : null),
                    }}
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
                        marginBottom: 10,
                        ...(Platform.OS === 'web'
                            ? ({ boxShadow: '0 0 15px rgba(0,0,0,0.1)' } as any)
                            : {
                                  shadowColor: '#000',
                                  shadowOpacity: 0.06,
                                  shadowRadius: 8,
                                  elevation: 2,
                              }),
                    }}
                >
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: 'rgb(31, 82, 237)',
                        }}
                    >
                        🍎NutriApp
                    </Text>
                    <Ionicons
                        name="person-circle"
                        size={40}
                        color={'rgb(31, 82, 237)'}
                        style={{ margin: 3 }}
                        accessibilityLabel="Ir al perfil"
                        onPress={() => router.push('../profile')}
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
                    {/* Bienvenida */}
                    <Text style={{ fontSize: 18, fontWeight: '700' }}>
                        Bienvenido {userInfo?.name || 'Usuario'}
                    </Text>
                    {session && (
                        <Text style={{ color: '#000' }}>
                            Session: {session.user.id}
                        </Text>
                    )}

                    {/* Selector de día (solo navegación) */}
                    <View
                        style={{
                            width: '92%',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: '#0090FF',
                            padding: 14,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Pressable
                                onPress={goPrevDay}
                                style={{ padding: 8 }}
                            >
                                <Ionicons
                                    name="chevron-back-circle"
                                    size={28}
                                    color={'rgb(31,82,237)'}
                                />
                            </Pressable>
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: '700',
                                    color: '#0A66C2',
                                }}
                            >
                                Resumen diario
                            </Text>
                            <Pressable
                                onPress={goNextDay}
                                style={{ padding: 8 }}
                            >
                                <Ionicons
                                    name="chevron-forward-circle"
                                    size={28}
                                    color={'rgb(31,82,237)'}
                                />
                            </Pressable>
                        </View>
                        <Text style={{ color: '#111827', marginTop: 6 }}>
                            {daySummary?.date ?? selectedDate}
                        </Text>
                    </View>

                    {/* Dos tarjetas: Nivel de actividad y Objetivo (lado a lado en web, stack en móvil) */}
                    <View
                        style={{
                            width: '92%',
                            gap: 12,
                            flexDirection:
                                Platform.OS === 'web'
                                    ? ('row' as const)
                                    : ('column' as const),
                        }}
                    >
                        <InfoCard
                            title="Nivel de actividad"
                            value={
                                daySummary?.targets?.activity_level_id ||
                                userInfo?.activity_level
                            }
                        />
                        <InfoCard
                            title="Objetivo"
                            value={
                                daySummary?.targets?.objective_id ||
                                userInfo?.objective
                            }
                        />
                    </View>

                    {/* Barras de progreso + filtro de fecha */}
                    <View
                        style={{
                            width: '92%',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            padding: 14,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6,
                            }}
                        >
                            <Text style={{ fontWeight: '700', fontSize: 16 }}>
                                Progreso diario
                            </Text>
                            {Platform.OS === 'web' && (
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={onDateInputChange}
                                    style={{
                                        border: '1px solid #E5E7EB',
                                        borderRadius: 8,
                                        padding: '6px 8px',
                                    }}
                                />
                            )}
                        </View>

                        {loadingDay ? (
                            <ActivityIndicator />
                        ) : dayErr ? (
                            <Text style={{ color: '#EF4444' }}>{dayErr}</Text>
                        ) : daySummary ? (
                            <>
                                <ProgressRow
                                    label="Calorías"
                                    unit=" kcal"
                                    current={num(daySummary.totals?.calories)}
                                    target={num(
                                        daySummary.targets?.required_calories
                                    )}
                                />
                                <ProgressRow
                                    label="Proteína"
                                    unit=" g"
                                    current={num(daySummary.totals?.protein_g)}
                                    target={num(
                                        daySummary.targets?.required_protein_g
                                    )}
                                />
                                <ProgressRow
                                    label="Carbohidratos"
                                    unit=" g"
                                    current={num(daySummary.totals?.carbs_g)}
                                    target={num(
                                        daySummary.targets?.required_carbs_g
                                    )}
                                />
                                <ProgressRow
                                    label="Grasas"
                                    unit=" g"
                                    current={num(daySummary.totals?.fat_g)}
                                    target={num(
                                        daySummary.targets?.required_fat_g
                                    )}
                                />
                            </>
                        ) : (
                            <Text style={{ color: '#6B7280' }}>
                                Sin datos para este día
                            </Text>
                        )}
                    </View>

                    {/* Listado de comidas del día */}
                    <View style={{ width: '92%', marginTop: 6 }}>
                        <Text
                            style={{
                                fontWeight: '700',
                                fontSize: 16,
                                marginBottom: 8,
                            }}
                        >
                            Comidas del día
                        </Text>
                        {loadingDay ? (
                            <ActivityIndicator />
                        ) : daySummary?.meals?.length ? (
                            daySummary.meals.map((m) => (
                                <MealMiniCard key={m.id} item={m} />
                            ))
                        ) : (
                            <Text style={{ color: '#6B7280' }}>
                                Aún no has registrado comidas.
                            </Text>
                        )}
                    </View>

                    {/* Perfil (lo que ya tenías) */}
                    {loadingUser ? (
                        <ActivityIndicator />
                    ) : userErr ? (
                        <Text style={{ color: '#EF4444' }}>{userErr}</Text>
                    ) : userInfo ? (
                        <View
                            style={{
                                width: '92%',
                                backgroundColor: '#FFFFFF',
                                borderRadius: 16,
                                borderWidth: 2,
                                borderColor: '#0090FF',
                                padding: 14,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '700',
                                    color: '#0A66C2',
                                }}
                            >
                                Tu perfil nutricional
                            </Text>
                            <Text
                                style={{
                                    marginTop: 4,
                                    color: '#0A66C2',
                                    fontWeight: '700',
                                }}
                            >
                                Datos básicos
                            </Text>
                            <View
                                style={{
                                    marginTop: 6,
                                    borderWidth: 1,
                                    borderColor: '#D7E9FF',
                                    borderRadius: 10,
                                    padding: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        color: 'rgb(31, 82, 237)',
                                        fontWeight: '600',
                                    }}
                                >
                                    Nombre
                                </Text>
                                <Text style={{ marginTop: 2 }}>
                                    {userInfo.name}
                                </Text>
                            </View>
                            <View
                                style={{
                                    marginTop: 6,
                                    borderWidth: 1,
                                    borderColor: '#D7E9FF',
                                    borderRadius: 10,
                                    padding: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        color: 'rgb(31, 82, 237)',
                                        fontWeight: '600',
                                    }}
                                >
                                    Género
                                </Text>
                                <Text style={{ marginTop: 2 }}>
                                    {userInfo.gender}
                                </Text>
                            </View>
                            {/* …resto del card original (si quieres, puedes volver a usar tu componente UserCard) */}
                        </View>
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
                    accessibilityLabel="Añadir comida"
                    onPress={() => {
                        if (Platform.OS === 'web') fileInputRef.current?.click()
                        else {
                            Alert.alert(
                                'Nueva comida',
                                '¿De dónde quieres obtener la imagen?',
                                [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                        text: 'Tomar foto',
                                        onPress: async () => {
                                            const { status } =
                                                await requestCameraPermissionsAsync()
                                            if (status === 'granted') {
                                                const r =
                                                    await launchCameraAsync({
                                                        mediaTypes:
                                                            MediaTypeOptions.Images,
                                                        quality: 0.9,
                                                    })
                                                if (!r.canceled)
                                                    await sendImage(
                                                        r.assets[0].uri,
                                                        r.assets[0].fileName ||
                                                            ''
                                                    )
                                            }
                                        },
                                    },
                                    {
                                        text: 'Galería',
                                        onPress: async () => {
                                            const { status } =
                                                await requestMediaLibraryPermissionsAsync()
                                            if (status === 'granted') {
                                                const r =
                                                    await launchImageLibraryAsync(
                                                        {
                                                            mediaTypes:
                                                                MediaTypeOptions.Images,
                                                            quality: 0.9,
                                                        }
                                                    )
                                                if (!r.canceled)
                                                    await sendImage(
                                                        r.assets[0].uri,
                                                        r.assets[0].fileName ||
                                                            ''
                                                    )
                                            }
                                        },
                                    },
                                ]
                            )
                        }
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
                        {analysis && (
                            <View style={{ marginTop: 12 }}>
                                {recommendation?.trim() ? (
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
                                            style={{
                                                fontWeight: '700',
                                                fontSize: 16,
                                                marginBottom: 6,
                                            }}
                                        >
                                            Recomendación 👩‍⚕️
                                        </Text>
                                        <Text>{recommendation}</Text>
                                    </View>
                                ) : null}
                                {(() => {
                                    const t = computeTotalsFromAlimentos(
                                        getAlimentos(analysis)
                                    )
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
                                                style={{
                                                    fontWeight: '700',
                                                    fontSize: 16,
                                                    marginBottom: 6,
                                                }}
                                            >
                                                Totales estimados
                                            </Text>
                                            <Text>
                                                Calorías: {fmtNum(t.calorias)}{' '}
                                                kcal
                                            </Text>
                                            <Text>
                                                Proteínas:{' '}
                                                {fmtNum(t.proteinas_g)} g
                                            </Text>
                                            <Text>
                                                Carbohidratos:{' '}
                                                {fmtNum(t.carbohidratos_g)} g
                                            </Text>
                                            <Text>
                                                Grasas: {fmtNum(t.grasas_g)} g
                                            </Text>
                                        </View>
                                    )
                                })()}
                                {getAlimentos(analysis).length ? (
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
                                        {getAlimentos(analysis).map(
                                            (it, idx) => (
                                                <View
                                                    key={`${
                                                        it?.nombre ?? 'alimento'
                                                    }-${idx}`}
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
                                                            textTransform:
                                                                'capitalize',
                                                        }}
                                                    >
                                                        {it?.nombre ??
                                                            'Alimento'}
                                                    </Text>
                                                    <Text>
                                                        Porción:{' '}
                                                        {fmtNum(
                                                            it?.cantidad_estimada_gramos
                                                        )}{' '}
                                                        g
                                                    </Text>
                                                    <Text>
                                                        Calorías:{' '}
                                                        {fmtNum(it?.calorias)}{' '}
                                                        kcal
                                                    </Text>
                                                    <Text>
                                                        Prot:{' '}
                                                        {fmtNum(
                                                            it?.proteinas_g
                                                        )}{' '}
                                                        g · Carb:{' '}
                                                        {fmtNum(
                                                            it?.carbohidratos_g
                                                        )}{' '}
                                                        g · Grasas:{' '}
                                                        {fmtNum(it?.grasas_g)} g
                                                    </Text>
                                                </View>
                                            )
                                        )}
                                    </View>
                                ) : null}
                            </View>
                        )}
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
                            disabled={isSavingResult}
                            style={{
                                backgroundColor: isSavingResult
                                    ? '#34D39980'
                                    : '#10B981',
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
                            onPress={clearPreview}
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
