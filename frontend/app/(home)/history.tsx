import { useEffect, useMemo, useState, useCallback } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, View } from "react-native";

// Si usas Supabase Auth en el front, trae el token así:
// import { supabase } from "@/lib/supabase"; // tu instancia
// const { data: { session } } = await supabase.auth.getSession();
// const token = session?.access_token;

type Meal = {
  id: string;
  user_id: string;
  date_creation: string; // ISO
  img_url: string;
  recommendation: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
};

export default function History() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || "";
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => {
    // Si tienes token, añádelo aquí
    // const token = ""; // <-- colócalo si corresponde
    // return token ? { Authorization: `Bearer ${token}` } : undefined;
    return undefined;
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/history_meals`, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: Meal[] = await res.json();
      // Opcional: ordena por fecha descendente
      data.sort(
        (a, b) =>
          new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
      );
      setMeals(data);
    } catch (err: any) {
      setError(err?.message || "Error al obtener historial");
    } finally {
      setLoading(false);
    }
  }, [API_URL, headers]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const renderItem = ({ item }: { item: Meal }) => {
    const date = new Date(item.date_creation);
    const fechaLima = date.toLocaleString("es-PE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return (
      <View
        style={{
          backgroundColor: "#111827",
          borderRadius: 16,
          padding: 12,
          marginHorizontal: 16,
          marginVertical: 8,
          borderWidth: 1,
          borderColor: "#1F2937",
        }}
      >
        {/* Imagen */}
        <Image
          source={{ uri: item.img_url }}
          style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            marginBottom: 10,
            backgroundColor: "#0B1220",
          }}
          resizeMode="cover"
        />

        {/* Encabezado: fecha y calorías */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <Text style={{ color: "#93C5FD", fontWeight: "700", fontSize: 14 }}>
            {fechaLima}
          </Text>
          <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 16 }}>
            {Math.round(item.total_calories)} kcal
          </Text>
        </View>

        {/* Macros */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
          <Pill label="Proteína" value={`${Math.round(item.total_protein_g)} g`} />
          <Pill label="Carbs" value={`${Math.round(item.total_carbs_g)} g`} />
          <Pill label="Grasas" value={`${Math.round(item.total_fat_g)} g`} />
        </View>

        {/* Recomendación */}
        <Text style={{ color: "#D1D5DB", lineHeight: 20 }}>
          {item.recommendation}
        </Text>
      </View>
    );
  };

  if (!API_URL) {
    return (
      <Centered>
        <Text style={{ color: "#FCA5A5", textAlign: "center" }}>
          Falta configurar EXPO_PUBLIC_API_URL.
        </Text>
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator />
        <Text style={{ color: "#9CA3AF", marginTop: 8 }}>Cargando historial…</Text>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <Text style={{ color: "#FCA5A5", marginBottom: 8 }}>
          {`Error: ${error}`}
        </Text>
        <Text
          onPress={fetchHistory}
          style={{
            color: "white",
            backgroundColor: "#10B981",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            overflow: "hidden",
            fontWeight: "700",
          }}
        >
          Reintentar
        </Text>
      </Centered>
    );
  }

  if (meals.length === 0) {
    return (
      <Centered>
        <Text style={{ color: "#9CA3AF" }}>
          Aún no hay registros de comidas.
        </Text>
      </Centered>
    );
  }

  return (
    <FlatList
      data={meals}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingVertical: 12 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}

/** UI helpers */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#0B1220",
      }}
    >
      {children}
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#1F2937",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: "#E5E7EB", fontSize: 12, fontWeight: "700" }}>
        {label}: <Text style={{ fontWeight: "900" }}>{value}</Text>
      </Text>
    </View>
  );
}
