import { useFonts } from "expo-font";
import { ActivityIndicator, Platform, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TrpcProvider } from "./src/api/TrpcProvider";
import { AuthProvider } from "./src/hooks/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { appPaperTheme } from "./src/theme/paperTheme";

const materialCommunityIconsFont =
  require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf") as number;

function useWebIconFontsReady(): boolean {
  const [loaded] = useFonts(
    Platform.OS === "web"
      ? { "material-community": materialCommunityIconsFont }
      : {}
  );
  return Platform.OS !== "web" || loaded;
}

export default function App() {
  const fontsReady = useWebIconFontsReady();

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appPaperTheme}>
        <TrpcProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </TrpcProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
