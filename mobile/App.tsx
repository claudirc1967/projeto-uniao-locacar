import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TrpcProvider } from "./src/api/TrpcProvider";
import { AuthProvider } from "./src/hooks/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { appPaperTheme } from "./src/theme/paperTheme";

export default function App() {
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
