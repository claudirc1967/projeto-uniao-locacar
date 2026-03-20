import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "DriverRentals">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando proprietário",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa — ver instruções",
  CANCELLED: "Cancelada",
};

export function DriverRentalsScreen({ navigation }: Props) {
  const q = trpc.driver.myRentals.useQuery();

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

  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.title}>Minhas locações</Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Nenhuma locação ainda.</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("RentalDetail", { rentalId: item.id })
          }
        >
          <Text style={styles.veh}>{item.vehicle.title}</Text>
          <Text style={styles.meta}>
            {statusLabel[item.status] ?? item.status}
          </Text>
          {item.status === "REJECTED" && item.motivoRecusa ? (
            <Text style={styles.rejectionNote}>
              Motivo da recusa: {item.motivoRecusa}
            </Text>
          ) : null}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  veh: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#64748b", marginTop: 4 },
  rejectionNote: {
    marginTop: 8,
    fontSize: 14,
    color: "#b45309",
    lineHeight: 20,
  },
  empty: { color: "#94a3b8", marginTop: 24 },
  err: { color: "#dc2626" },
});
