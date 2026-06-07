import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import { LogBox } from "react-native";

import App from "./App";

LogBox.ignoreLogs([
  "TRPCClientError: E-mail ou senha inválidos",
  'TRPCClientError: No "query"-procedure on path "ads.decision"',
  "TRPCClientError: Já existe solicitação ou locação ativa para este veículo",
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
