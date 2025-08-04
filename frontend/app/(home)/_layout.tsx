import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function HomeTabsLayout() {
    return (
        <Tabs>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Inicio",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" color={color} size={size} />
                    ),
                    headerShown: false
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: "Historial",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add" color={color} size={size} />
                    ),
                    headerShown: false
                }}
            />
        </Tabs>
    )
}