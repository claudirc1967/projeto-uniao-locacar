import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TrpcProvider } from "./src/api/TrpcProvider";
import { AuthProvider } from "./src/hooks/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { appPaperTheme } from "./src/theme/paperTheme";

export default function App() {
  // Carrega a fonte de ícones do react-native-paper. Referenciar a fonte aqui
  // faz o Metro embuti-la no build nativo (EAS). Não bloqueamos a renderização:
  // a UI aparece de imediato e os ícones surgem assim que a fonte carrega,
  // evitando tela branca caso o carregamento da fonte falhe/atrase.
  useFonts(MaterialCommunityIcons.font);

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
