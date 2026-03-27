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

type Props = NativeStackScreenProps<RootStackParamList, "DriverRentals">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando proprietário",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa — ver instruções",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export function DriverRentalsScreen({ navigation }: Props) {
  const theme = useTheme();
  const q = trpc.driver.myRentals.useQuery();

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
    <FlatList
      data={q.data ?? []}
      keyExtractor={(i) => i.id}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text variant="headlineSmall" style={styles.header}>
          Minhas locações
        </Text>
      }
      ListEmptyComponent={
        <Text variant="bodyMedium" style={styles.empty}>
          Nenhuma locação ainda.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            navigation.navigate("RentalDetail", { rentalId: item.id })
          }
        >
          <Card mode="elevated" style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">{item.vehicle.title}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                {statusLabel[item.status] ?? item.status}
              </Text>
              {item.status === "REJECTED" && item.motivoRecusa ? (
                <Text variant="bodySmall" style={styles.rejectionNote}>
                  Motivo da recusa: {item.motivoRecusa}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        </Pressable>
      )}
      ListFooterComponent={
        <Button mode="text" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  list: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  card: { marginBottom: 12, borderRadius: 16 },
  meta: { marginTop: 4, opacity: 0.85 },
  rejectionNote: {
    marginTop: 8,
    color: "#b45309",
    lineHeight: 20,
  },
  empty: { marginTop: 24, opacity: 0.7 },
});
