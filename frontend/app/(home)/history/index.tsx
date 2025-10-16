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
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useAuth } from '../../../context/AuthContext'

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

export default function History() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || ''
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()

  const headers = useMemo(() => {
    const h: Record<string, string> = { Accept: 'application/json' }
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`
    return h
  }, [session?.access_token])

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

        data.sort(
          (a, b) =>
            new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
        )
        setMeals(data)
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(e?.message || 'Error al obtener historial')
        }
      } finally {
        if (showSpinner) setLoading(false)
      }
      // Nota: devolvemos el controller por si quieres abortar manualmente donde lo llames
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
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      >
        <View style={styles.card}>
          <Image
            // cache-buster para evitar imágenes antiguas en caché
            source={{ uri: `${item.img_url}?v=${encodeURIComponent(item.date_creation)}` }}
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

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            <Pill label="Proteína" value={`${Math.round(item.total_protein_g)} g`} />
            <Pill label="Carbs" value={`${Math.round(item.total_carbs_g)} g`} />
            <Pill label="Grasas" value={`${Math.round(item.total_fat_g)} g`} />
          </View>

          <Text style={{ color: '#101011ff', lineHeight: 20 }}>
            {item.recommendation}
          </Text>
        </View>
      </Pressable>
    )
  }

  if (!API_URL)
    return (
      <Centered>
        <Text style={{ color: '#FCA5A5', textAlign: 'center' }}>
          Falta configurar EXPO_PUBLIC_API_URL.
        </Text>
      </Centered>
    )

  if (loading)
    return (
      <Centered>
        <ActivityIndicator />
        <Text style={{ color: '#ececedff', marginTop: 8 }}>
          Cargando historial…
        </Text>
      </Centered>
    )

  if (error)
    return (
      <Centered>
        <Text style={{ color: '#FCA5A5', marginBottom: 8 }}>{`Error: ${error}`}</Text>
      </Centered>
    )

  if (meals.length === 0)
    return (
      <Centered>
        <Text style={{ color: '#9CA3AF' }}>Aún no hay registros de comidas.</Text>
      </Centered>
    )

  return (
    <>
      <FlatList
        data={meals}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 5 }}
        ListHeaderComponent={
          <Text
            style={{
              fontSize: 28,
              fontWeight: '900',
              textAlign: 'center',
              color: '#111827',
              letterSpacing: 0.3,
              marginTop: 25,
              marginBottom: 0,
            }}
          >
            Historial de comidas
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
        backgroundColor: '#0B1220',
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
      <Text style={{ color: '#ffffffff', fontSize: 12, fontWeight: '700' }}>
        {label}: <Text style={{ fontWeight: '900' }}>{value}</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 14,
    marginVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.01)',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 4,
        shadowColor: '#000',
      },
      default: {},
    }),
  },
})
