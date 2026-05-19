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

function LabeledLine({ label, value }: { label: string; value: string }) {
  return (
    <Text variant="bodyMedium">
      <Text style={styles.labelBold}>{label}</Text>
      {value}
    </Text>
  );
}

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
      <Text variant="titleMedium" style={[styles.badge, { color: theme.colors.primary }]}>
        {map[q.data!.status] ?? q.data!.status}
      </Text>

      {p.ratingCount > 0 ? (
        <Card mode="outlined" style={[styles.card, styles.reputationCard]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.labelBold}>
              Reputação
            </Text>
            <Text variant="bodyLarge" style={{ marginTop: 4 }}>
              {p.averageRating.toFixed(1)} ★ · {p.ratingCount} avaliação(ões)
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {q.data!.status === "REJECTED" && p.rejectionReason?.trim() ? (
        <Card mode="outlined" style={[styles.card, styles.warnCard]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.labelBold}>
              Motivo da recusa
            </Text>
            <Text variant="bodyMedium" style={styles.rejectionText}>
              {p.rejectionReason.trim()}
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.gap}>
          <LabeledLine label="Nome: " value={p.fullName ?? "—"} />
          <LabeledLine
            label="Telefone: "
            value={p.phone ? maskPhone(p.phone) : "—"}
          />
          <LabeledLine label="CPF: " value={p.cpf ? maskCpf(p.cpf) : "—"} />
          <LabeledLine label="CNH: " value={p.cnh ?? "—"} />
          <LabeledLine label="Categoria CNH: " value={p.cnhCategory ?? "—"} />
          <LabeledLine
            label="Validade CNH: "
            value={p.cnhValidity ? maskDate(p.cnhValidity) : "—"}
          />
          <LabeledLine
            label="Anos de habilitação: "
            value={p.cnhYears != null ? String(p.cnhYears) : "—"}
          />
          <LabeledLine
            label="CNH com EAR: "
            value={p.cnhHasEar ? "Sim" : "Não"}
          />
          <LabeledLine
            label="Atestado antecedentes: "
            value={p.criminalAttestation ? "Sim" : "Não"}
          />
          <LabeledLine
            label="Cadastrado no Aplicativo (Uber,99,etc): "
            value={p.uberRegistered ? "Sim" : "Não"}
          />
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
  reputationCard: {
    borderColor: "#c7d2fe",
    backgroundColor: "#eef2ff",
    marginBottom: 4,
  },
  gap: { gap: 8 },
  labelBold: { fontWeight: "700" },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
});
