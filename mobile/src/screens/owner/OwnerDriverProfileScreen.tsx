import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpf, maskDate, maskPhone } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerDriverProfile">;

export function OwnerDriverProfileScreen({ navigation, route }: Props) {
  const { driverUserId } = route.params;
  const q = trpc.owner.getDriverProfile.useQuery({ driverUserId });

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
        <AppButton title="Voltar" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const p = q.data!;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dados do motorista</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{p.fullName ?? "—"}</Text>

        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{p.email ?? "—"}</Text>

        <Text style={styles.label}>Telefone</Text>
        <Text style={styles.value}>{p.phone ? maskPhone(p.phone) : "—"}</Text>

        <Text style={styles.label}>CPF</Text>
        <Text style={styles.value}>{p.cpf ? maskCpf(p.cpf) : "—"}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>CNH</Text>
        <Text style={styles.label}>Número</Text>
        <Text style={styles.value}>{p.cnh ?? "—"}</Text>

        <Text style={styles.label}>Categoria</Text>
        <Text style={styles.value}>{p.cnhCategory ?? "—"}</Text>

        <Text style={styles.label}>Validade</Text>
        <Text style={styles.value}>{p.cnhValidity ? maskDate(p.cnhValidity) : "—"}</Text>

        <Text style={styles.label}>Anos de habilitação</Text>
        <Text style={styles.value}>
          {p.cnhYears != null ? String(p.cnhYears) : "—"}
        </Text>

        <Text style={styles.label}>EAR</Text>
        <Text style={styles.value}>
          {p.cnhHasEar == null ? "—" : p.cnhHasEar ? "Sim" : "Não"}
        </Text>

        <Text style={styles.label}>Atestado antecedentes</Text>
        <Text style={styles.value}>
          {p.criminalAttestation == null
            ? "—"
            : p.criminalAttestation
              ? "Sim"
              : "Não"}
        </Text>

        <Text style={styles.label}>Uber</Text>
        <Text style={styles.value}>
          {p.uberRegistered == null ? "—" : p.uberRegistered ? "Sim" : "Não"}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Endereço</Text>
        <Text style={styles.label}>CEP</Text>
        <Text style={styles.value}>{p.cep ?? "—"}</Text>

        <Text style={styles.label}>Logradouro</Text>
        <Text style={styles.value}>{p.logradouro ?? "—"}</Text>

        <Text style={styles.label}>Número</Text>
        <Text style={styles.value}>{p.numero ?? "—"}</Text>

        <Text style={styles.label}>Complemento</Text>
        <Text style={styles.value}>{p.complemento ?? "—"}</Text>

        <Text style={styles.label}>Bairro</Text>
        <Text style={styles.value}>{p.bairro ?? "—"}</Text>

        <Text style={styles.label}>Cidade/UF</Text>
        <Text style={styles.value}>
          {[p.cidade, p.uf].filter(Boolean).join(" / ") || "—"}
        </Text>
      </View>

      <AppButton
        title="Voltar"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 22, fontWeight: "700" },
  block: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 4, marginBottom: 4 },
  label: { fontSize: 13, color: "#64748b" },
  value: { fontSize: 15, color: "#0f172a" },
  err: { color: "#dc2626", marginBottom: 12 },
});

