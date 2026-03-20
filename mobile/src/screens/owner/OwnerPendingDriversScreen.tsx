import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerPendingDrivers">;

export function OwnerPendingDriversScreen({ navigation }: Props) {
  const q = trpc.owner.listPendingDrivers.useQuery();
  const utils = trpc.useUtils();
  const approve = trpc.owner.approveDriver.useMutation({
    onSuccess: () => void utils.owner.listPendingDrivers.invalidate(),
  });
  const reject = trpc.owner.rejectDriver.useMutation({
    onSuccess: () => void utils.owner.listPendingDrivers.invalidate(),
  });

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
    <View style={styles.flex}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.driverUserId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.title}>Motoristas pendentes</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum motorista pendente.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate("OwnerDriverProfile", {
                driverUserId: item.driverUserId,
              })
            }
          >
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.meta}>{item.fullName ?? "—"}</Text>

            <View style={styles.row}>
              <AppButton
                title="Aprovar"
                onPress={() =>
                  approve.mutate({ driverUserId: item.driverUserId })
                }
                loading={approve.isPending}
              />
              <AppButton
                title="Rejeitar"
                variant="danger"
                onPress={() =>
                  reject.mutate({ driverUserId: item.driverUserId })
                }
                loading={reject.isPending}
              />
            </View>
          </Pressable>
        )}
      />
      <AppButton
        title="Voltar"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  email: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#64748b" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  empty: { color: "#94a3b8", marginTop: 24 },
  err: { color: "#dc2626" },
});
