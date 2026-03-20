import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text } from "react-native";
import { AppButton } from "../../components/AppButton";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerHome">;

export function OwnerHomeScreen({ navigation }: Props) {
  const { logout } = useAuth();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Proprietário</Text>
      <Text style={styles.sub}>Gerencie veículos, motoristas e locações.</Text>
      <AppButton
        title="Meu perfil"
        onPress={() => navigation.navigate("OwnerProfile")}
      />
      <AppButton
        title="Meus veículos"
        onPress={() => navigation.navigate("OwnerVehicles")}
      />
      <AppButton
        title="Motoristas pendentes"
        onPress={() => navigation.navigate("OwnerPendingDrivers")}
      />
      <AppButton
        title="Solicitações de locação"
        onPress={() => navigation.navigate("OwnerRentals")}
      />
      <AppButton
        title="Ver marketplace (todos)"
        variant="ghost"
        onPress={() => navigation.navigate("Marketplace")}
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
