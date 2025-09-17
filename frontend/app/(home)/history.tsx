import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function History() {

    const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

    const [meals, setMeals] = useState<any[]>([])

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`${API_URL}/history`);

            } catch (error) {
                console.error("Error fetching history:", error);
            }
        }
    }, []) 

    return (
        <View>
            <Text>Historial</Text>
            <Text>Aquí se mostrará el historial de tus actividades y registros.</Text>
        </View>
    )
}