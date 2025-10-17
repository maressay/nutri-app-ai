import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function HomeTabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarHideOnKeyboard: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={"rgb(31, 82, 237)"} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add" color={"rgb(31, 82, 237)"} size={size} />
          ),
          headerShown: false,
        }}
      />

      <Tabs.Screen name="meal/[id]" options={{ href: null }} />
    </Tabs>
  );
}
