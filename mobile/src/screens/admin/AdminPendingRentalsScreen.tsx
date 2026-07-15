import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { formatDateTimeDisplay, maskPhone } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminPendingRentals">;

const OLDER_THAN_HOURS = 24;

export function AdminPendingRentalsScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const q = trpc.admin.rentals.listPendingOlderThan.useQuery(
    { olderThanHours: OLDER_THAN_HOURS },
    { enabled: user?.role === "ADMIN" }
  );

  useFocusEffect(
    useCallback(() => {
      if (user?.role === "ADMIN") {
        void q.refetch();
      }
    }, [q, user?.role])
  );

  if (q.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background, padding: 16 },
        ]}
      >
        <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
          {trpcErrorMessage(q.error)}
        </Text>
        <Button mode="outlined" onPress={() => void q.refetch()}>
          Tentar de novo
        </Button>
        <Button
          mode="outlined"
          icon="arrow-left"
          style={{ marginTop: 8 }}
          onPress={() => navigation.goBack()}
        >
          Voltar
        </Button>
      </View>
    );
  }

  const rows = q.data?.rentals ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.rentalId}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 72 + insets.bottom },
          rows.length === 0 ? styles.listEmpty : null,
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="titleMedium">Aguardando locador há {OLDER_THAN_HOURS}h+</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Contate o locador. Se não houver resposta, abra a solicitação e
              recuse pela plataforma para liberar o motorista.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}
          >
            Nenhuma solicitação pendente há mais de {OLDER_THAN_HOURS} horas.
          </Text>
        }
        renderItem={({ item }) => (
          <Card
            mode="outlined"
            style={styles.card}
            onPress={() =>
              navigation.navigate("AdminRentalDetail", {
                rentalId: item.rentalId,
              })
            }
          >
            <Card.Content style={styles.cardContent}>
              <Text variant="titleSmall">
                {item.vehicle.title} · {item.vehicle.plate}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Solicitada: {formatDateTimeDisplay(item.requestedAt)} ·{" "}
                {item.hoursWaiting}h aguardando
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Locador:{" "}
                {item.owner.nomeRazaoSocial || item.owner.email || "—"}
                {item.owner.phone
                  ? ` · ${maskPhone(item.owner.phone)}`
                  : ""}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Motorista: {item.driverName || item.driverEmail || "—"}
              </Text>
              <Button
                mode="text"
                compact
                icon="chevron-right"
                contentStyle={styles.openBtn}
                onPress={() =>
                  navigation.navigate("AdminRentalDetail", {
                    rentalId: item.rentalId,
                  })
                }
              >
                Abrir
              </Button>
            </Card.Content>
          </Card>
        )}
      />

      <View
        style={[
          styles.footerBar,
          {
            paddingBottom: insets.bottom,
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  header: { gap: 6, marginBottom: 8 },
  card: { marginBottom: 4 },
  cardContent: { gap: 4 },
  meta: { opacity: 0.85 },
  openBtn: { flexDirection: "row-reverse" },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
