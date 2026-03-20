import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text } from "react-native";
import { AppButton } from "../../components/AppButton";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "DriverHome">;

export function DriverHomeScreen({ navigation }: Props) {
  const { logout } = useAuth();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Motorista</Text>
      <Text style={styles.sub}>
        Complete o cadastro, acompanhe aprovação e solicite veículos no
        marketplace.
      </Text>
      <AppButton
        title="Pré-cadastro / endereço"
        onPress={() => navigation.navigate("DriverPreRegister")}
      />
      <AppButton
        title="Status do cadastro"
        onPress={() => navigation.navigate("DriverStatus")}
      />
      <AppButton
        title="Marketplace"
        onPress={() => navigation.navigate("Marketplace")}
      />
      <AppButton
        title="Minhas locações"
        onPress={() => navigation.navigate("DriverRentals")}
      />
      <AppButton title="Sair" variant="danger" onPress={() => void logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700" },
  sub: { color: "#64748b", marginBottom: 8 },
});
