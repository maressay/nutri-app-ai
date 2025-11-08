import { useEffect, useMemo, useState, useCallback } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, Stack, router } from 'expo-router'
import { useAuth } from '../../../../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'

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
type MealItem = {
    id: string
    meal_id: string
    name: string
    weight_grams: number
    calories_kcal: number
    protein_g: number
    fat_g: number
    carbs_g: number
}
type MealDetailResponse = { meal: Meal; items: MealItem[] }

export default function MealDetail() {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''
    const { id } = useLocalSearchParams<{ id: string }>()
    const { session } = useAuth()

    const [data, setData] = useState<MealDetailResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const headers = useMemo(() => {
        const h: Record<string, string> = { Accept: 'application/json' }
        if (session?.access_token)
            h.Authorization = `Bearer ${session.access_token}`
        return h
    }, [session?.access_token])

    const fetchDetail = useCallback(async () => {
        try {
            setError(null)
            const res = await fetch(`${API_URL}/history_meals/${id}`, {
                headers,
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json: MealDetailResponse = await res.json()
            setData(json)
        } catch (e: any) {
            setError(e?.message || 'Error al obtener detalle')
        } finally {
            setLoading(false)
        }
    }, [API_URL, id, headers])

    useEffect(() => {
        fetchDetail()
    }, [fetchDetail])

    const fmt = (iso?: string) =>
        iso
            ? new Date(iso).toLocaleString('es-PE', {
                  year: 'numeric',
                  month: 'long',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
              })
            : ''

    if (!API_URL)
        return (
            <ScreenWhite>
                <Text style={{ color: '#991B1B' }}>
                    Falta configurar EXPO_PUBLIC_API_URL
                </Text>
            </ScreenWhite>
        )
    if (loading)
        return (
            <ScreenWhite>
                <ActivityIndicator />
                <Text style={{ color: '#6B7280', marginTop: 8 }}>
                    Cargando…
                </Text>
            </ScreenWhite>
        )
    if (error)
        return (
            <ScreenWhite>
                <Text style={{ color: '#991B1B' }}>{`Error: ${error}`}</Text>
            </ScreenWhite>
        )
    if (!data) return null

    const { meal, items } = data

    const { from } = useLocalSearchParams<{ from?: string }>()

    return (
        <>
            {/* <Stack.Screen options={{ title: 'Detalle de comida' }} /> */}
            <Stack.Screen
                options={{
                    title: 'Detalle de comida',
                    headerLeft: () => (
                        <Pressable
                            onPress={() => {
                                if (from === 'home') {
                                    router.push('/(home)/')
                                }
                                else {
                                    router.push('/(home)/history')
                                }
                            }}
                            style={{ marginLeft: 8 }}
                        >
                            <Ionicons
                                name="arrow-back"
                                size={24}
                                color="#000"
                            />
                        </Pressable>
                    ),
                }}
            />
            <ScrollView
                style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                contentContainerStyle={{ paddingBottom: 24 }}
            >
                <Image
                    source={{ uri: meal.img_url }}
                    resizeMode="cover"
                    style={{ width: '100%', height: 260 }}
                />
                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                    <Text
                        style={{
                            color: '#111827',
                            fontSize: 22,
                            fontWeight: '800',
                        }}
                    >
                        {Math.round(meal.total_calories)} kcal
                    </Text>
                    <Text style={{ color: '#7e806bff', marginTop: 4 }}>
                        {fmt(meal.date_creation)}
                    </Text>

                    <View
                        style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}
                    >
                        <Card
                            title="Proteína"
                            value={`${Math.round(meal.total_protein_g)} g`}
                        />
                        <Card
                            title="Carbs"
                            value={`${Math.round(meal.total_carbs_g)} g`}
                        />
                        <Card
                            title="Grasas"
                            value={`${Math.round(meal.total_fat_g)} g`}
                        />
                    </View>

                    <View
                        style={{
                            backgroundColor: '#ffffffff',
                            borderWidth: 1,
                            borderColor: '#004feeff',
                            padding: 12,
                            borderRadius: 12,
                            marginTop: 16,
                        }}
                    >
                        <Text
                            style={{
                                color: '#0a0e17ff',
                                fontWeight: '700',
                                marginBottom: 6,
                            }}
                        >
                            Recomendación
                        </Text>
                        <Text style={{ color: '#000000ff', lineHeight: 20 }}>
                            {meal.recommendation}
                        </Text>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
                    <Text
                        style={{
                            color: '#111827',
                            fontWeight: '800',
                            fontSize: 18,
                            marginBottom: 10,
                        }}
                    >
                        Detalle por alimento
                    </Text>
                    {items.map((it) => (
                        <View
                            key={it.id}
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderWidth: 1,
                                borderColor: '#E5E7EB',
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 10,
                                shadowColor: '#000',
                                shadowOpacity: 0.04,
                                shadowRadius: 6,
                                shadowOffset: { width: 0, height: 2 },
                                elevation: 1,
                            }}
                        >
                            <Text
                                style={{
                                    color: '#111827',
                                    fontWeight: '700',
                                    fontSize: 16,
                                    marginBottom: 6,
                                    textTransform: 'capitalize',
                                }}
                            >
                                {it.name}
                            </Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}
                            >
                                <Chip
                                    label="Peso"
                                    value={`${it.weight_grams} g`}
                                />
                                <Chip
                                    label="Calorías"
                                    value={`${it.calories_kcal} kcal`}
                                />
                                <Chip
                                    label="Prot"
                                    value={`${it.protein_g} g`}
                                />
                                <Chip label="Grasa" value={`${it.fat_g} g`} />
                                <Chip label="Carbs" value={`${it.carbs_g} g`} />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </>
    )
}

function ScreenWhite({ children }: { children: React.ReactNode }) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: '#ffffffff',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
        >
            {children}
        </View>
    )
}
function Card({ title, value }: { title: string; value: string }) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#ffbd39ff',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 12,
                alignItems: 'center',
            }}
        >
            <Text
                style={{ color: '#ffc609ff', fontSize: 12, fontWeight: '700' }}
            >
                {title}
            </Text>
            <Text
                style={{
                    color: '#111827',
                    fontSize: 16,
                    fontWeight: '900',
                    marginTop: 2,
                }}
            >
                {value}
            </Text>
        </View>
    )
}
function Chip({ label, value }: { label: string; value: string }) {
    return (
        <View
            style={{
                backgroundColor: '#F3F4F6',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
            }}
        >
            <Text style={{ color: '#111827', fontSize: 12, fontWeight: '700' }}>
                {label}: <Text style={{ fontWeight: '900' }}>{value}</Text>
            </Text>
        </View>
    )
}
