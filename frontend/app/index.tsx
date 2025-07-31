import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function Index() {

    const {session, loading } = useAuth()

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size={"large"}/>
            </View>
        )
    }

    return <Redirect href={session ? "/(home)" : "/(auth)"}></Redirect>

}