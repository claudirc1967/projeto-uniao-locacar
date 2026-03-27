import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text, useTheme } from "react-native-paper";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpf, maskDate, maskPhone } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerDriverProfile">;

export function OwnerDriverProfileScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { driverUserId } = route.params;
  const q = trpc.owner.getDriverProfile.useQuery({ driverUserId });

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
        <Text style={{ color: theme.colors.error, marginBottom: 12 }}>
          {trpcErrorMessage(q.error)}
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    );
  }

  const p = q.data!;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Dados do motorista
      </Text>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.gap}>
          <Text variant="labelLarge">Nome</Text>
          <Text variant="bodyLarge">{p.fullName ?? "—"}</Text>
          <Divider style={styles.div} />
          <Text variant="labelLarge">E-mail</Text>
          <Text variant="bodyLarge">{p.email ?? "—"}</Text>
          <Divider style={styles.div} />
          <Text variant="labelLarge">Telefone</Text>
          <Text variant="bodyLarge">{p.phone ? maskPhone(p.phone) : "—"}</Text>
          <Divider style={styles.div} />
          <Text variant="labelLarge">CPF</Text>
          <Text variant="bodyLarge">{p.cpf ? maskCpf(p.cpf) : "—"}</Text>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Title title="CNH" />
        <Card.Content style={styles.gap}>
          <Row label="Número" value={p.cnh ?? "—"} />
          <Row label="Categoria" value={p.cnhCategory ?? "—"} />
          <Row
            label="Validade"
            value={p.cnhValidity ? maskDate(p.cnhValidity) : "—"}
          />
          <Row
            label="Anos de habilitação"
            value={p.cnhYears != null ? String(p.cnhYears) : "—"}
          />
          <Row
            label="EAR"
            value={p.cnhHasEar == null ? "—" : p.cnhHasEar ? "Sim" : "Não"}
          />
          <Row
            label="Atestado antecedentes"
            value={
              p.criminalAttestation == null
                ? "—"
                : p.criminalAttestation
                  ? "Sim"
                  : "Não"
            }
          />
          <Row
            label="Uber"
            value={
              p.uberRegistered == null ? "—" : p.uberRegistered ? "Sim" : "Não"
            }
          />
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Title title="Endereço" />
        <Card.Content style={styles.gap}>
          <Row label="CEP" value={p.cep ?? "—"} />
          <Row label="Logradouro" value={p.logradouro ?? "—"} />
          <Row label="Número" value={p.numero ?? "—"} />
          <Row label="Complemento" value={p.complemento ?? "—"} />
          <Row label="Bairro" value={p.bairro ?? "—"} />
          <Row
            label="Cidade/UF"
            value={[p.cidade, p.uf].filter(Boolean).join(" / ") || "—"}
          />
        </Card.Content>
      </Card>

      <Button mode="text" onPress={() => navigation.goBack()}>
        Voltar
      </Button>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBlock}>
      <Text variant="labelLarge">{label}</Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 24, paddingBottom: 40, gap: 12 },
  title: { marginBottom: 4 },
  card: { borderRadius: 16 },
  gap: { gap: 8 },
  div: { marginVertical: 4 },
  rowBlock: { gap: 4 },
});
