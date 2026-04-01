import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Divider,
  HelperText,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpf, maskDate, maskPhone } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerDriverProfile">;

export function OwnerDriverProfileScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { driverUserId } = route.params;
  const q = trpc.owner.getDriverProfile.useQuery({ driverUserId });
  const utils = trpc.useUtils();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  const invalidateAll = async () => {
    await utils.owner.getDriverProfile.invalidate({ driverUserId });
    await utils.owner.listPendingDrivers.invalidate();
    await utils.owner.listRejectedDrivers.invalidate();
  };

  const approve = trpc.owner.approveDriver.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      navigation.goBack();
    },
  });

  const reject = trpc.owner.rejectDriver.useMutation({
    onSuccess: async () => {
      setRejectOpen(false);
      setMotivo("");
      await invalidateAll();
      navigation.goBack();
    },
  });

  const reopen = trpc.owner.reopenDriverForReview.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      navigation.goBack();
    },
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
        <Text style={{ color: theme.colors.error, marginBottom: 12 }}>
          {trpcErrorMessage(q.error)}
        </Text>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    );
  }

  const p = q.data!;
  const motivoOk = motivo.trim().length >= 3;

  const openReject = () => {
    setMotivo("");
    setRejectOpen(true);
  };

  const confirmReject = () => {
    if (!motivoOk) return;
    reject.mutate({ driverUserId, motivo: motivo.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="bodyMedium" style={styles.lead}>
          Revise os dados e escolha uma ação.
        </Text>

        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge">Status do cadastro</Text>
            <Text variant="bodyLarge" style={styles.statusText}>
              {p.status === "PENDING"
                ? "Pendente de análise"
                : p.status === "APPROVED"
                  ? "Aprovado"
                  : "Cadastro recusado"}
            </Text>
            {p.status === "REJECTED" && p.rejectionReason?.trim() ? (
              <Text variant="bodyMedium" style={styles.rejectionBox}>
                Motivo da recusa: {p.rejectionReason.trim()}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

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

        {p.status === "PENDING" ? (
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => approve.mutate({ driverUserId })}
              loading={approve.isPending}
              disabled={approve.isPending || reject.isPending}
            >
              Aprovar
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={openReject}
              loading={reject.isPending}
              disabled={approve.isPending || reject.isPending}
            >
              Rejeitar
            </Button>
          </View>
        ) : null}

        {p.status === "REJECTED" ? (
          <Button
            mode="contained-tonal"
            style={styles.reopenBtn}
            onPress={() => reopen.mutate({ driverUserId })}
            loading={reopen.isPending}
            disabled={reopen.isPending}
          >
            Recolocar em análise
          </Button>
        ) : null}

        <HelperText type="error" visible={!!reject.error}>
          {reject.error ? trpcErrorMessage(reject.error) : ""}
        </HelperText>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Cancelar
        </Button>
      </View>

      <Portal>
        <Dialog visible={rejectOpen} onDismiss={() => setRejectOpen(false)}>
          <Dialog.Title>Motivo da recusa</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 8, opacity: 0.85 }}>
              Informe o motivo (mínimo 3 caracteres). O motorista poderá ver esta
              mensagem no status do cadastro.
            </Text>
            <TextInput
              mode="outlined"
              label="Motivo"
              value={motivo}
              onChangeText={setMotivo}
              multiline
              numberOfLines={4}
              style={{ backgroundColor: theme.colors.surface }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectOpen(false)}>Fechar</Button>
            <Button
              onPress={confirmReject}
              loading={reject.isPending}
              disabled={!motivoOk || reject.isPending}
            >
              Confirmar recusa
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
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
  container: { padding: 24, paddingBottom: 12, gap: 12 },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  lead: { marginBottom: 4, opacity: 0.9 },
  statusText: { marginTop: 4 },
  rejectionBox: {
    marginTop: 12,
    lineHeight: 22,
    color: "#b45309",
  },
  card: { borderRadius: 16 },
  gap: { gap: 8 },
  div: { marginVertical: 4 },
  rowBlock: { gap: 4 },
  actions: { gap: 8, marginTop: 4 },
  reopenBtn: { marginTop: 4 },
});
