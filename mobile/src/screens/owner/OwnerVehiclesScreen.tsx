import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import {
  type ContractTime,
  formatMoneyWithContractPeriod,
} from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerVehicles">;

export function OwnerVehiclesScreen({ navigation }: Props) {
  const q = trpc.owner.listMyVehicles.useQuery();

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
        <AppButton title="Tentar de novo" onPress={() => q.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Veículos</Text>
            <AppButton
              title="Novo veículo"
              onPress={() => navigation.navigate("VehicleForm", {})}
            />
          </View>
        }
        renderItem={({ item }) => {
          const thumb = item.photos[0]?.photoUrl;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("VehicleForm", { vehicleId: item.id })
              }
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]}>
                  <Text style={styles.thumbPhT}>Sem foto</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.plate} ·{" "}
                  {formatMoneyWithContractPeriod(
                    item.dailyRateCents,
                    (item as { contractTime?: ContractTime }).contractTime
                  )}
                </Text>
                <Text style={styles.meta}>
                  {item.available ? "Disponível" : "Indisponível"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  thumb: { width: 96, height: 96, backgroundColor: "#f1f5f9" },
  thumbPh: { justifyContent: "center", alignItems: "center" },
  thumbPhT: { fontSize: 11, color: "#94a3b8" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  meta: { color: "#64748b", marginTop: 4 },
  err: { color: "#dc2626", textAlign: "center", marginBottom: 12 },
});
