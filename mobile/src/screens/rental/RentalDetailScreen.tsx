import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RentalDetail">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando proprietário",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

export function RentalDetailScreen({ route }: Props) {
  const { rentalId } = route.params;
  const q = trpc.driver.getRentalDetail.useQuery({ rentalId });

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{trpcErrorMessage(q.error)}</Text>
      </View>
    );
  }

  const r = q.data!;
  const showPickup =
    (r.status === "ACTIVE" || r.status === "APPROVED") && r.pickupInstructions;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{r.vehicle.title}</Text>
      <Text style={styles.badge}>
        {statusLabel[r.status] ?? r.status}
      </Text>
      <Text style={styles.meta}>Placa: {r.vehicle.plate}</Text>
      {r.status === "REJECTED" && r.motivoRecusa ? (
        <View style={[styles.box, styles.rejectionBox]}>
          <Text style={styles.boxTitle}>Motivo da recusa</Text>
          <Text style={styles.boxBody}>{r.motivoRecusa}</Text>
        </View>
      ) : null}
      {showPickup ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Como / onde / quando retirar</Text>
          <Text style={styles.boxBody}>{r.pickupInstructions}</Text>
        </View>
      ) : null}
      {r.contractText ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Contrato</Text>
          <Text style={styles.boxBody}>{r.contractText}</Text>
        </View>
      ) : null}
      {r.contractUrl ? (
        <AppButton
          title="Abrir link do contrato"
          onPress={() => void Linking.openURL(r.contractUrl!)}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700" },
  badge: { fontSize: 16, color: "#2563eb", marginVertical: 8 },
  meta: { color: "#64748b" },
  box: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  boxTitle: { fontWeight: "600", marginBottom: 8 },
  boxBody: { fontSize: 15, lineHeight: 22, color: "#334155" },
  rejectionBox: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  err: { color: "#dc2626" },
});
