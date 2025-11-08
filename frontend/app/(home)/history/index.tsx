// app/(home)/history/index.tsx
import { useEffect, useMemo, useState, useCallback } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    Text,
    View,
    Pressable,
    StyleSheet,
    Platform,
    AppState,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useAuth } from '../../../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Meal = {
    id: string
    user_id: string
    date_creation: string
    img_url: string
    recommendation: string
    total_calories: number
    total_protein_g: number
    total_carbs_g: number
    total_fat_g: number
}

// estados y tipos de filtros/orden
type Preset = 'todos' | 'hoy' | 'semana' | 'mes' | 'personalizado'
type SortKey = 'kcal' | 'proteina' | 'carbs' | 'grasas' | 'fecha'
type SortDir = 'asc' | 'desc'

const STORAGE_KEY = 'historyFilters-v1'

export default function History() {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''
    const [meals, setMeals] = useState<Meal[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { session } = useAuth()

    const headers = useMemo(() => {
        const h: Record<string, string> = { Accept: 'application/json' }
        if (session?.access_token)
            h.Authorization = `Bearer ${session.access_token}`
        return h
    }, [session?.access_token])

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [mealDeleteId, setMealDeleteId] = useState<string | null>(null)
    const [loadingDelete, setLoadingDelete] = useState(false)

    // filtros/orden y UI de rango personalizado
    const [preset, setPreset] = useState<Preset>('todos')
    const [dateFrom, setDateFrom] = useState<string>('') // YYYY-MM-DD
    const [dateTo, setDateTo] = useState<string>('') // YYYY-MM-DD
    const [sortKey, setSortKey] = useState<SortKey>('fecha')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [showRangeModal, setShowRangeModal] = useState(false)

    // Persistencia: cargar al iniciar
    useEffect(() => {
        ;(async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY)
                if (raw) {
                    const p = JSON.parse(raw) as {
                        preset: Preset
                        dateFrom: string
                        dateTo: string
                        sortKey: SortKey
                        sortDir: SortDir
                    }
                    if (p.preset) setPreset(p.preset)
                    if (p.dateFrom) setDateFrom(p.dateFrom)
                    if (p.dateTo) setDateTo(p.dateTo)
                    if (p.sortKey) setSortKey(p.sortKey)
                    if (p.sortDir) setSortDir(p.sortDir)
                }
            } catch {}
        })()
    }, [])

    // Persistencia: guardar ante cambios
    useEffect(() => {
        AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ preset, dateFrom, dateTo, sortKey, sortDir })
        ).catch(() => {})
    }, [preset, dateFrom, dateTo, sortKey, sortDir])

    const delete_meal = async (meal_id: string) => {
        if (session == null) return
        setLoadingDelete(true)
        const res = await fetch(`${API_URL}/delete_meal/${meal_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
            setMeals((prev) => prev.filter((m) => m.id !== meal_id))
        }
        setShowDeleteConfirm(false)
        setLoadingDelete(false)
    }

    const handleAccept = () => {
        if (mealDeleteId != null) delete_meal(mealDeleteId)
    }

    const handleCancel = () => setShowDeleteConfirm(false)

    const fetchHistory = useCallback(
        async (opts?: { showSpinner?: boolean }) => {
            const showSpinner = opts?.showSpinner ?? meals.length === 0
            const controller = new AbortController()
            try {
                setError(null)
                if (showSpinner) setLoading(true)

                const res = await fetch(`${API_URL}/history_meals`, {
                    headers: {
                        ...headers,
                        'Cache-Control': 'no-cache',
                        Pragma: 'no-cache',
                    },
                    cache: 'no-store',
                    signal: controller.signal,
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data: Meal[] = await res.json()

                // Orden inicial por fecha desc para consistencia
                data.sort(
                    (a, b) =>
                        new Date(b.date_creation).getTime() -
                        new Date(a.date_creation).getTime()
                )
                setMeals(data)
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    setError(e?.message || 'Error al obtener historial')
                }
            } finally {
                if (showSpinner) setLoading(false)
            }
            return controller
        },
        [API_URL, headers, meals.length]
    )

    // Carga inicial
    useEffect(() => {
        fetchHistory({ showSpinner: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Revalida cada vez que la pantalla gana foco
    useFocusEffect(
        useCallback(() => {
            fetchHistory({ showSpinner: false })
        }, [fetchHistory])
    )

    // Revalida al volver la app a primer plano
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') fetchHistory({ showSpinner: false })
        })
        return () => sub.remove()
    }, [fetchHistory])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await fetchHistory({ showSpinner: false })
        setRefreshing(false)
    }, [fetchHistory])

    const clearAll = () => {
        setPreset('todos')
        setDateFrom('')
        setDateTo('')
        setSortKey('fecha') // opcional: vuelve a ordenar por fecha
        setSortDir('desc') // opcional: desc por defecto
    }

    // helpers de rango según preset
    const todayISO = () => {
        const d = new Date()
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    }
    const startOfWeekISO = () => {
        const d = new Date()
        const day = d.getDay() // 0 dom, 1 lun...
        const diff = (day + 6) % 7 // queremos lunes como inicio
        d.setDate(d.getDate() - diff)
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    }
    const startOfMonthISO = () => {
        const d = new Date()
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        return `${yyyy}-${mm}-01`
    }

    const presetToRange = useCallback((): { from?: Date; to?: Date } => {
        if (preset === 'todos') {
            return {}
        }
        if (preset === 'hoy') {
            const from = new Date(`${todayISO()}T00:00:00`)
            const to = new Date(`${todayISO()}T23:59:59`)
            return { from, to }
        }
        if (preset === 'semana') {
            const from = new Date(`${startOfWeekISO()}T00:00:00`)
            const to = new Date(`${todayISO()}T23:59:59`)
            return { from, to }
        }
        if (preset === 'mes') {
            const from = new Date(`${startOfMonthISO()}T00:00:00`)
            const to = new Date(`${todayISO()}T23:59:59`)
            return { from, to }
        }
        // personalizado
        let from: Date | undefined
        let to: Date | undefined
        if (dateFrom) from = new Date(`${dateFrom}T00:00:00`)
        if (dateTo) to = new Date(`${dateTo}T23:59:59`)
        return { from, to }
    }, [preset, dateFrom, dateTo])

    // derivar lista visible con filtro + orden
    const visibleMeals = useMemo(() => {
        const { from, to } = presetToRange()

        const within = (dt: string) => {
            const t = new Date(dt).getTime()
            if (from && t < from.getTime()) return false
            if (to && t > to.getTime()) return false
            return true
        }

        const filtered = meals.filter((m) => within(m.date_creation))

        const getter = (m: Meal) => {
            switch (sortKey) {
                case 'kcal':
                    return m.total_calories
                case 'proteina':
                    return m.total_protein_g
                case 'carbs':
                    return m.total_carbs_g
                case 'grasas':
                    return m.total_fat_g
                case 'fecha':
                default:
                    return new Date(m.date_creation).getTime()
            }
        }

        const sorted = [...filtered].sort((a, b) => {
            const A = getter(a)
            const B = getter(b)
            if (A < B) return sortDir === 'asc' ? -1 : 1
            if (A > B) return sortDir === 'asc' ? 1 : -1
            // Criterio secundario consistente por fecha desc
            const fa =
                typeof A === 'number' ? 0 : new Date(a.date_creation).getTime()
            const fb =
                typeof B === 'number' ? 0 : new Date(b.date_creation).getTime()
            return fb - fa
        })

        return sorted
    }, [meals, sortKey, sortDir, presetToRange])

    const toggleDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))

    const openCustomRange = () => {
        setPreset('personalizado')
        setShowRangeModal(true)
    }

    const applyCustomRange = () => {
        // Validación simple YYYY-MM-DD
        const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
        if (dateFrom && !valid(dateFrom)) return
        if (dateTo && !valid(dateTo)) return
        setShowRangeModal(false)
    }

    const renderItem = ({ item }: { item: Meal }) => {
        const fecha = new Date(item.date_creation).toLocaleString('es-PE', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })

        return (
            <Pressable
                onPress={() =>
                    router.push({
                        pathname: '/(home)/history/meal/[id]',
                        params: { id: item.id },
                    })
                }
                android_ripple={{ color: 'rgba(0,0,0,0.5)' }}
                style={{ marginHorizontal: 14, marginVertical: 6, zIndex: 0 }}
            >
                <View style={styles.card}>
                    <Image
                        source={{
                            uri: `${item.img_url}?v=${encodeURIComponent(
                                item.date_creation
                            )}`,
                        }}
                        style={{
                            width: '100%',
                            height: 180,
                            borderRadius: 12,
                            marginBottom: 10,
                        }}
                        resizeMode="cover"
                    />
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 6,
                        }}
                    >
                        <Text
                            style={{
                                color: '#0077ff',
                                fontWeight: '700',
                                fontSize: 14,
                            }}
                        >
                            {fecha}
                        </Text>
                        <Text
                            style={{
                                color: '#ffcc00ff',
                                fontWeight: '800',
                                fontSize: 16,
                            }}
                        >
                            {Math.round(item.total_calories)} kcal
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 12,
                            marginBottom: 8,
                        }}
                    >
                        <Pill
                            label="Proteína"
                            value={`${Math.round(item.total_protein_g)} g`}
                        />
                        <Pill
                            label="Carbs"
                            value={`${Math.round(item.total_carbs_g)} g`}
                        />
                        <Pill
                            label="Grasas"
                            value={`${Math.round(item.total_fat_g)} g`}
                        />
                    </View>

                    <Text style={{ color: '#101011ff', lineHeight: 20 }}>
                        {item.recommendation}
                    </Text>

                    <Pressable
                        onPress={() => {
                            setShowDeleteConfirm(true)
                            setMealDeleteId(item.id)
                        }}
                    >
                        <Ionicons
                            name="trash"
                            style={{
                                color: 'red',
                                position: 'absolute',
                                bottom: -3,
                                right: 3,
                                zIndex: 100,
                            }}
                            size={20}
                        />
                    </Pressable>
                </View>
            </Pressable>
        )
    }

    if (!API_URL)
        return (
            <Centered>
                <Text style={{ color: '#111827', textAlign: 'center' }}>
                    Falta configurar EXPO_PUBLIC_API_URL.
                </Text>
            </Centered>
        )

    if (loading)
        return (
            <Centered>
                <ActivityIndicator />
                <Text style={{ color: '#111827', marginTop: 8 }}>
                    Cargando historial…
                </Text>
            </Centered>
        )

    if (error)
        return (
            <Centered>
                <Text
                    style={{ color: '#111827', marginBottom: 8 }}
                >{`Error: ${error}`}</Text>
            </Centered>
        )

    if (meals.length === 0)
        return (
            <Centered>
                <Text style={{ color: '#111827' }}>
                    Aún no hay registros de comidas.
                </Text>
            </Centered>
        )

    return (
        <>
            {/* Modal eliminar */}
            {showDeleteConfirm && (
                <Modal
                    visible={showDeleteConfirm}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDeleteConfirm(false)}
                >
                    <View style={styles.overlay}>
                        <View style={styles.modal}>
                            <Text style={styles.title}>¿Estás seguro?</Text>
                            <Text style={styles.text}>
                                Esta acción no se puede deshacer.
                            </Text>

                            <View style={styles.row}>
                                <Pressable
                                    onPress={handleCancel}
                                    style={[styles.button, styles.cancel]}
                                >
                                    <Text style={styles.buttonText}>
                                        Cancelar
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleAccept}
                                    style={[styles.button, styles.accept]}
                                >
                                    <Text style={styles.buttonText}>
                                        {loadingDelete ? (
                                            <ActivityIndicator
                                                color="#fff"
                                                size={20}
                                            />
                                        ) : (
                                            'Aceptar'
                                        )}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Modal rango personalizado */}
            <Modal
                visible={showRangeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRangeModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.overlay}
                >
                    <View style={[styles.modal, { width: 320 }]}>
                        <Text style={styles.title}>Rango personalizado</Text>
                        <Text
                            style={{
                                fontSize: 12,
                                marginBottom: 10,
                                textAlign: 'center',
                            }}
                        >
                            Formato: YYYY-MM-DD (ej. {todayISO()})
                        </Text>
                        <Text style={{ fontWeight: '700', marginBottom: 4 }}>
                            Desde
                        </Text>
                        <TextInput
                            value={dateFrom}
                            onChangeText={setDateFrom}
                            placeholder="YYYY-MM-DD"
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.input}
                        />
                        <Text
                            style={{
                                fontWeight: '700',
                                marginTop: 10,
                                marginBottom: 4,
                            }}
                        >
                            Hasta
                        </Text>
                        <TextInput
                            value={dateTo}
                            onChangeText={setDateTo}
                            placeholder="YYYY-MM-DD"
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.input}
                        />
                        <View style={[styles.row, { marginTop: 16 }]}>
                            <Pressable
                                onPress={() => setShowRangeModal(false)}
                                style={[styles.button, styles.cancel]}
                            >
                                <Text style={styles.buttonText}>Cerrar</Text>
                            </Pressable>
                            <Pressable
                                onPress={applyCustomRange}
                                style={[styles.button, styles.accept]}
                            >
                                <Text style={styles.buttonText}>Aplicar</Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <FlatList
                data={visibleMeals}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerStyle={{
                    paddingVertical: 5,
                    backgroundColor: '#fff',
                }}
                ListHeaderComponent={
                    <View style={{ paddingTop: 20, paddingBottom: 6 }}>
                        <Text
                            style={{
                                fontSize: 28,
                                fontWeight: '900',
                                textAlign: 'center',
                                color: '#111827',
                                letterSpacing: 0.3,
                                marginBottom: 12,
                            }}
                        >
                            Historial de comidas
                        </Text>

                        {/* Controles de filtro/orden */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 12,
                                gap: 8,
                            }}
                        >
                            <View style={styles.wrapRow}>
                                <Toggle
                                    active={preset === 'todos'}
                                    label="Todos"
                                    onPress={() => setPreset('todos')}
                                />
                                <Toggle
                                    active={preset === 'hoy'}
                                    label="Hoy"
                                    onPress={() => setPreset('hoy')}
                                />
                                <Toggle
                                    active={preset === 'semana'}
                                    label="Semana"
                                    onPress={() => setPreset('semana')}
                                />
                                <Toggle
                                    active={preset === 'mes'}
                                    label="Mes"
                                    onPress={() => setPreset('mes')}
                                />
                                <Toggle
                                    active={preset === 'personalizado'}
                                    label="Personalizado"
                                    onPress={openCustomRange}
                                    icon="calendar"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.orderRow}>
                            <Text
                                style={{ fontWeight: '800', color: '#111827' }}
                            >
                                Ordenar por:
                            </Text>
                            <SmallToggle
                                active={sortKey === 'fecha'}
                                label="Fecha"
                                onPress={() => setSortKey('fecha')}
                            />
                            <SmallToggle
                                active={sortKey === 'kcal'}
                                label="Kcal"
                                onPress={() => setSortKey('kcal')}
                            />
                            <SmallToggle
                                active={sortKey === 'proteina'}
                                label="Proteína"
                                onPress={() => setSortKey('proteina')}
                            />
                            <SmallToggle
                                active={sortKey === 'carbs'}
                                label="Carbs"
                                onPress={() => setSortKey('carbs')}
                            />
                            <SmallToggle
                                active={sortKey === 'grasas'}
                                label="Grasas"
                                onPress={() => setSortKey('grasas')}
                            />
                            <Pressable
                                onPress={toggleDir}
                                style={{ marginLeft: 'auto', padding: 6 }}
                            >
                                <Ionicons
                                    name={
                                        sortDir === 'asc'
                                            ? 'arrow-up'
                                            : 'arrow-down'
                                    }
                                    size={20}
                                    color="#111827"
                                />
                            </Pressable>
                            <Pressable
                                onPress={clearAll}
                                style={{
                                    paddingVertical: 6,
                                    paddingHorizontal: 10,
                                    marginLeft: 4,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: '#E5E7EB',
                                    backgroundColor: '#F3F4F6',
                                }}
                            >
                                <Text
                                    style={{
                                        fontWeight: '800',
                                        color: '#111827',
                                        fontSize: 12,
                                    }}
                                >
                                    Limpiar
                                </Text>
                            </Pressable>
                        </View>

                        {/* Etiqueta de rango activo */}
                        <View style={{ paddingHorizontal: 12, marginTop: 6 }}>
                            <Text style={{ color: '#6b7280', fontSize: 12 }}>
                                {(() => {
                                    if (preset === 'todos')
                                        return 'Rango: Todos'
                                    const { from, to } = presetToRange()
                                    const fmt = (d?: Date) =>
                                        d
                                            ? d.toLocaleDateString('es-PE', {
                                                  year: 'numeric',
                                                  month: '2-digit',
                                                  day: '2-digit',
                                              })
                                            : '—'
                                    return `Rango: ${fmt(from)} → ${fmt(to)}`
                                })()}
                            </Text>
                        </View>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            />
        </>
    )
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
        >
            {children}
        </View>
    )
}

function Pill({ label, value }: { label: string; value: string }) {
    return (
        <View
            style={{
                backgroundColor: '#0B1220',
                borderWidth: 1,
                borderColor: '#1F2937',
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
            }}
        >
            <Text
                style={{ color: '#ffffffff', fontSize: 12, fontWeight: '700' }}
            >
                {label}: <Text style={{ fontWeight: '900' }}>{value}</Text>
            </Text>
        </View>
    )
}

// === NUEVO: Botoncitos reutilizables para filtros/orden ===
function Toggle({
    active,
    label,
    onPress,
    icon,
}: {
    active: boolean
    label: string
    onPress: () => void
    icon?: keyof typeof Ionicons.glyphMap
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.chip,
                {
                    backgroundColor: active ? '#111827' : '#F3F4F6',
                    borderColor: '#E5E7EB',
                },
            ]}
        >
            {icon ? (
                <Ionicons
                    name={icon}
                    size={14}
                    color={active ? '#fff' : '#111827'}
                    style={{ marginRight: 6 }}
                />
            ) : null}
            <Text
                style={{
                    color: active ? '#fff' : '#111827',
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>
        </Pressable>
    )
}

function SmallToggle({
    active,
    label,
    onPress,
}: {
    active: boolean
    label: string
    onPress: () => void
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.smallChip,
                {
                    backgroundColor: active ? '#111827' : '#F3F4F6',
                    borderColor: '#E5E7EB',
                },
            ]}
        >
            <Text
                style={{
                    color: active ? '#fff' : '#111827',
                    fontWeight: '800',
                    fontSize: 12,
                }}
            >
                {label}
            </Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 10 },
            },
            android: { elevation: 4, shadowColor: '#000' },
            default: {},
        }),
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: 280,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    text: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    button: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    cancel: { backgroundColor: '#9ca3af' },
    accept: { backgroundColor: '#16a34a' },
    buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    smallChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    wrapRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        marginTop: 6,
    },
    orderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginTop: 10,
    },
})
