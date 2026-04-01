import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpf, maskDate, maskPhone } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "DriverStatus">;

const map: Record<string, string> = {
  PENDING: "Pendente de aprovação",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export function DriverStatusScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const q = trpc.driver.myStatus.useQuery();

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

  const p = q.data!.profile;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 8 + insets.bottom },
        ]}
      >
      <Text variant="headlineSmall" style={styles.title}>
        Status
      </Text>
      <Text variant="titleMedium" style={[styles.badge, { color: theme.colors.primary }]}>
        {map[q.data!.status] ?? q.data!.status}
      </Text>

      {q.data!.status === "REJECTED" && p.rejectionReason?.trim() ? (
        <Card mode="outlined" style={[styles.card, styles.warnCard]}>
          <Card.Content>
            <Text variant="titleSmall">Motivo da recusa</Text>
            <Text variant="bodyMedium" style={styles.rejectionText}>
              {p.rejectionReason.trim()}
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.gap}>
          <Text variant="bodyMedium">Nome: {p.fullName ?? "—"}</Text>
          <Text variant="bodyMedium">
            Telefone: {p.phone ? maskPhone(p.phone) : "—"}
          </Text>
          <Text variant="bodyMedium">CPF: {p.cpf ? maskCpf(p.cpf) : "—"}</Text>
          <Text variant="bodyMedium">CNH: {p.cnh ?? "—"}</Text>
          <Text variant="bodyMedium">Categoria CNH: {p.cnhCategory ?? "—"}</Text>
          <Text variant="bodyMedium">
            Validade CNH: {p.cnhValidity ? maskDate(p.cnhValidity) : "—"}
          </Text>
          <Text variant="bodyMedium">
            Anos de habilitação: {p.cnhYears ?? "—"}
          </Text>
          <Text variant="bodyMedium">
            CNH com EAR: {p.cnhHasEar ? "Sim" : "Não"}
          </Text>
          <Text variant="bodyMedium">
            Atestado antecedentes: {p.criminalAttestation ? "Sim" : "Não"}
          </Text>
          <Text variant="bodyMedium">
            Cadastrado no Aplicativo (Uber,99,etc): {p.uberRegistered ? "Sim" : "Não"}
          </Text>
        </Card.Content>
      </Card>

      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 24, paddingTop: 48, paddingBottom: 12, gap: 12 },
  title: { marginBottom: 4 },
  badge: { marginVertical: 8 },
  warnCard: { borderColor: "#fcd34d", backgroundColor: "#fffbeb" },
  rejectionText: { marginTop: 8, lineHeight: 22 },
  card: { borderRadius: 16 },
  gap: { gap: 8 },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
});
