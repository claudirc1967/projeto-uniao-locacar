import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
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
  const q = trpc.driver.myStatus.useQuery();

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

  const p = q.data!.profile;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status</Text>
      <Text style={styles.badge}>{map[q.data!.status] ?? q.data!.status}</Text>
      <Text style={styles.row}>Nome: {p.fullName ?? "—"}</Text>
      <Text style={styles.row}>Telefone: {p.phone ? maskPhone(p.phone) : "—"}</Text>
      <Text style={styles.row}>CPF: {p.cpf ? maskCpf(p.cpf) : "—"}</Text>
      <Text style={styles.row}>CNH: {p.cnh ?? "—"}</Text>
      <Text style={styles.row}>Categoria CNH: {p.cnhCategory ?? "—"}</Text>
      <Text style={styles.row}>
        Validade CNH: {p.cnhValidity ? maskDate(p.cnhValidity) : "—"}
      </Text>
      <Text style={styles.row}>Anos de habilitação: {p.cnhYears ?? "—"}</Text>
      <Text style={styles.row}>
        CNH com EAR: {p.cnhHasEar ? "Sim" : "Não"}
      </Text>
      <Text style={styles.row}>
        Atestado antecedentes: {p.criminalAttestation ? "Sim" : "Não"}
      </Text>
      <Text style={styles.row}>
        Cadastrado na Uber: {p.uberRegistered ? "Sim" : "Não"}
      </Text>
      <AppButton
        title="Voltar"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 24, paddingTop: 48, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  badge: { fontSize: 18, color: "#2563eb", marginVertical: 8 },
  row: { fontSize: 16, color: "#334155" },
  err: { color: "#dc2626" },
});
