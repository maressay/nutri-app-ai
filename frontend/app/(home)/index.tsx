import { Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function Home() {

    const { session } = useAuth()

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Welcome to Home</Text>
            {session && <Text>User ID: {session.user.id}</Text>}
        </View>
    )

}