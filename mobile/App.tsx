import { TrpcProvider } from "./src/api/TrpcProvider";
import { AuthProvider } from "./src/hooks/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <TrpcProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </TrpcProvider>
  );
}
