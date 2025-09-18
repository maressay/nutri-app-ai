import { Stack } from "expo-router";
export default function HistoryStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Historial" , headerShown: false}} />
      <Stack.Screen name="meal/[id]" options={{ title: "Detalle de comida" }} />
    </Stack>
  );
}