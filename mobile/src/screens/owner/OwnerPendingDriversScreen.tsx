import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerPendingDrivers">;

export function OwnerPendingDriversScreen({ navigation }: Props) {
  const theme = useTheme();
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
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>{trpcErrorMessage(q.error)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.driverUserId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text variant="headlineSmall" style={styles.title}>
            Motoristas pendentes
          </Text>
        }
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhum motorista pendente.
          </Text>
        }
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content>
              <Pressable
                onPress={() =>
                  navigation.navigate("OwnerDriverProfile", {
                    driverUserId: item.driverUserId,
                  })
                }
              >
                <Text variant="titleMedium">{item.email}</Text>
                <Text variant="bodyMedium" style={styles.meta}>
                  {item.fullName ?? "—"}
                </Text>
              </Pressable>
              <View style={styles.row}>
                <Button
                  mode="contained"
                  compact
                  onPress={() =>
                    approve.mutate({ driverUserId: item.driverUserId })
                  }
                  loading={approve.isPending}
                >
                  Aprovar
                </Button>
                <Button
                  mode="contained"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  compact
                  onPress={() =>
                    reject.mutate({ driverUserId: item.driverUserId })
                  }
                  loading={reject.isPending}
                >
                  Rejeitar
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingBottom: 24 },
  title: { marginBottom: 16 },
  card: { marginBottom: 12, borderRadius: 16 },
  meta: { marginTop: 4, opacity: 0.85 },
  row: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  empty: { marginTop: 24, opacity: 0.7 },
  footer: { padding: 16, paddingBottom: 24 },
});
