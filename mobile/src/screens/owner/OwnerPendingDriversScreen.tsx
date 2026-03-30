import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerPendingDrivers">;

type DriverRow = {
  driverUserId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  cpf: string | null;
  cnh: string | null;
  createdAt: Date;
};

export function OwnerPendingDriversScreen({ navigation }: Props) {
  const theme = useTheme();
  const pendingQ = trpc.owner.listPendingDrivers.useQuery();
  const rejectedQ = trpc.owner.listRejectedDrivers.useQuery();

  const loading = pendingQ.isLoading || rejectedQ.isLoading;
  const err = pendingQ.error ?? rejectedQ.error;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (err) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>{trpcErrorMessage(err)}</Text>
      </View>
    );
  }

  const pending = pendingQ.data ?? [];
  const rejected = rejectedQ.data ?? [];

  const sections = [
    {
      title: "Pendentes de análise",
      data: pending,
      kind: "pending" as const,
    },
    {
      title: "Cadastros recusados",
      data: rejected,
      kind: "rejected" as const,
    },
  ].filter((s) => s.data.length > 0);

  const emptyAll = pending.length === 0 && rejected.length === 0;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {emptyAll ? (
        <View style={styles.emptyWrap}>
          <Text variant="headlineSmall" style={styles.screenTitle}>
            Motoristas
          </Text>
          <Text variant="bodyMedium" style={styles.hint}>
            Toque em um motorista para ver os dados e aprovar, rejeitar ou
            recolocar na análise.
          </Text>
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhum motorista pendente ou com cadastro recusado.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.driverUserId}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("OwnerDriverProfile", {
                  driverUserId: item.driverUserId,
                })
              }
            >
              <Card mode="elevated" style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium">{item.email}</Text>
                  <Text variant="bodyMedium" style={styles.meta}>
                    {item.fullName ?? "—"}
                  </Text>
                  <Text variant="labelSmall" style={styles.tapHint}>
                    Toque para analisar
                  </Text>
                </Card.Content>
              </Card>
            </Pressable>
          )}
          ListHeaderComponent={
            <View>
              <Text variant="headlineSmall" style={styles.screenTitle}>
                Motoristas
              </Text>
              <Text variant="bodyMedium" style={styles.hint}>
                Toque em um motorista para ver os dados e aprovar, rejeitar ou
                recolocar na análise.
              </Text>
            </View>
          }
        />
      )}
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
  emptyWrap: { flex: 1, paddingTop: 8, paddingBottom: 24 },
  list: { paddingBottom: 24 },
  screenTitle: { marginBottom: 8 },
  hint: { marginBottom: 16, opacity: 0.85 },
  sectionTitle: { marginBottom: 10, marginTop: 8 },
  card: { marginBottom: 12, borderRadius: 16 },
  meta: { marginTop: 4, opacity: 0.85 },
  tapHint: { marginTop: 8, opacity: 0.65 },
  empty: { marginTop: 8, opacity: 0.7 },
  footer: { padding: 16, paddingBottom: 24 },
});
