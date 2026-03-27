import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  maskCpf,
  maskDate,
  maskPhone,
  onlyDigits,
} from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerRentalDetail">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando você",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const situationLabel: Record<string, string> = {
  ATIVA: "Ativa",
  LIBERADA: "Liberada",
  PENDENTE: "Pendente",
};

async function sharePdfFromUrl(url: string, rentalId: string) {
  const base =
    (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
  if (!base) throw new Error("Diretório do app indisponível.");
  const localUri = `${base}contract-${rentalId}.pdf`;
  await FileSystem.downloadAsync(url, localUri);
  await Sharing.shareAsync(localUri, {
    mimeType: "application/pdf",
    dialogTitle: "Contrato de locação",
  });
}

/** DD/MM/AAAA a partir de Date (valor exibido no formulário). */
function dateToDdMmYyyy(d: Date): string {
  return formatDateDisplay(d);
}

/** Interpreta string com máscara DD/MM/AAAA (8 dígitos). */
function parseDdMmYyyy(s: string): Date | null {
  const d = onlyDigits(s).slice(0, 8);
  if (d.length !== 8) return null;
  const day = Number(d.slice(0, 2));
  const mo = Number(d.slice(2, 4));
  const y = Number(d.slice(4, 8));
  if (mo < 1 || mo > 12 || day < 1 || day > 31 || y < 1900) return null;
  const dt = new Date(y, mo - 1, day, 12, 0, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return dt;
}

export function OwnerRentalDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { rentalId } = route.params;
  const q = trpc.owner.getIncomingRentalDetail.useQuery({ rentalId });
  const utils = trpc.useUtils();
  const unblock = trpc.owner.unblockDriverAfterRejection.useMutation({
    onSuccess: async () => {
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      await utils.owner.listIncomingRentals.invalidate();
    },
  });

  const submitReturn = trpc.owner.submitRentalReturn.useMutation({
    onSuccess: async () => {
      setReturnModalOpen(false);
      setReturnModalErr(null);
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      await utils.owner.listIncomingRentals.invalidate();
    },
    onError: (e) => setReturnModalErr(trpcErrorMessage(e)),
  });

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnDateStr, setReturnDateStr] = useState(() =>
    dateToDdMmYyyy(new Date())
  );
  const [returnSituation, setReturnSituation] = useState<"LIBERADA" | "PENDENTE">(
    "LIBERADA"
  );
  const [pendingReason, setPendingReason] = useState("");
  const [pendingPrevisaoStr, setPendingPrevisaoStr] = useState(() =>
    dateToDdMmYyyy(new Date())
  );
  const [returnModalErr, setReturnModalErr] = useState<string | null>(null);

  const r = q.data;

  const openReturnModal = () => {
    setReturnModalErr(null);
    if (r) {
      setReturnDateStr(
        r.returnDate
          ? dateToDdMmYyyy(new Date(r.returnDate))
          : dateToDdMmYyyy(new Date())
      );
      setPendingReason(r.pendingReason ?? "");
      setPendingPrevisaoStr(
        r.pendingResolutionExpectedAt
          ? dateToDdMmYyyy(new Date(r.pendingResolutionExpectedAt))
          : dateToDdMmYyyy(new Date())
      );
      setReturnSituation(r.situation === "PENDENTE" ? "PENDENTE" : "LIBERADA");
    }
    setReturnModalOpen(true);
  };

  const confirmReturn = () => {
    setReturnModalErr(null);
    const rd = parseDdMmYyyy(returnDateStr);
    if (!rd) {
      setReturnModalErr("Data de devolução inválida. Use DD/MM/AAAA.");
      return;
    }
    let previsao: Date | undefined;
    if (returnSituation === "PENDENTE") {
      const p = parseDdMmYyyy(pendingPrevisaoStr);
      if (!p) {
        setReturnModalErr("Previsão da solução inválida. Use DD/MM/AAAA.");
        return;
      }
      previsao = p;
    }
    submitReturn.mutate({
      rentalId,
      returnDate: rd,
      situation: returnSituation,
      pendingReason:
        returnSituation === "PENDENTE" ? pendingReason.trim() : undefined,
      pendingResolutionExpectedAt: previsao,
    });
  };

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

  const row = r!;
  const driverProfile = row.driver.driverProfile;

  const showApprovalOrRejection =
    row.status === "APPROVED" ||
    row.status === "ACTIVE" ||
    row.status === "REJECTED" ||
    row.status === "COMPLETED";

  const showSituationBlock =
    row.status === "ACTIVE" || row.status === "COMPLETED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Detalhes da solicitação</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Solicitação</Text>
        <Text style={styles.meta}>
          Data solicitação: {formatDateTimeDisplay(row.requestedAt)}
        </Text>
        {showApprovalOrRejection ? (
          <Text style={styles.meta}>
            {row.status === "REJECTED"
              ? "Data recusa: "
              : row.status === "COMPLETED"
                ? "Data conclusão: "
                : "Data aprovação: "}
            {formatDateTimeDisplay(row.updatedAt)}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          Status: {statusLabel[row.status] ?? row.status}
        </Text>
        {showSituationBlock ? (
          <>
            <Text style={styles.meta}>
              Situação:{" "}
              {situationLabel[row.situation] ?? row.situation}
            </Text>
            {row.returnDate ? (
              <Text style={styles.meta}>
                Data devolução: {formatDateDisplay(row.returnDate)}
              </Text>
            ) : null}
            {row.situation === "PENDENTE" && row.pendingReason ? (
              <Text style={styles.meta}>
                Motivo da pendência: {row.pendingReason}
              </Text>
            ) : null}
            {row.situation === "PENDENTE" && row.pendingResolutionExpectedAt ? (
              <Text style={styles.meta}>
                Previsão da solução:{" "}
                {formatDateDisplay(row.pendingResolutionExpectedAt)}
              </Text>
            ) : null}
          </>
        ) : null}
        {row.status === "REJECTED" && row.motivoRecusa ? (
          <Text style={styles.rejectionNote}>
            Motivo da recusa: {row.motivoRecusa}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      {(row.status === "ACTIVE" || row.status === "APPROVED") &&
      (row.pickupInstructions || row.contractUrl) ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Retirada e contrato</Text>
          {row.pickupInstructions ? (
            <>
              <Text style={styles.meta}>Instruções de retirada</Text>
              <Text style={styles.longText}>{row.pickupInstructions}</Text>
            </>
          ) : null}
          {row.contractUrl ? (
            <AppButton
              title="Contrato (PDF)"
              onPress={() =>
                Alert.alert("Contrato (PDF)", "O que deseja fazer?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Compartilhar PDF",
                    onPress: () =>
                      void sharePdfFromUrl(row.contractUrl!, row.rentalId).catch((e) =>
                        Alert.alert(
                          "Falha",
                          `Não foi possível baixar/compartilhar (${e instanceof Error ? e.message : "erro desconhecido"}).`
                        )
                      ),
                  },
                  {
                    text: "Abrir link",
                    onPress: () => void Linking.openURL(row.contractUrl!),
                  },
                ])
              }
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Veículo</Text>
        <Text style={styles.vehicleTitle}>{row.vehicle.title}</Text>
        <Text style={styles.meta}>
          Placa: {row.vehicle.plate}
        </Text>
        {row.vehicle.brand || row.vehicle.model || row.vehicle.year ? (
          <Text style={styles.meta}>
            {row.vehicle.brand ? row.vehicle.brand : ""}
            {row.vehicle.brand && row.vehicle.model ? " · " : ""}
            {row.vehicle.model ? row.vehicle.model : ""}
            {row.vehicle.year ? ` (${row.vehicle.year})` : ""}
          </Text>
        ) : null}
        <Text style={styles.meta}>Cor: {row.vehicle.cor?.trim() || "—"}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Motorista</Text>
        <Text style={styles.valueTitle}>{driverProfile?.fullName ?? "—"}</Text>
        <Text style={styles.meta}>E-mail: {row.driver.email}</Text>
        <Text style={styles.meta}>
          Telefone: {driverProfile?.phone ? maskPhone(driverProfile.phone) : "—"}
        </Text>
        <Text style={styles.meta}>
          CPF: {driverProfile?.cpf ? maskCpf(driverProfile.cpf) : "—"}
        </Text>

        <View style={styles.subBlock}>
          <Text style={styles.subTitle}>CNH</Text>
          <Text style={styles.meta}>Número: {driverProfile?.cnh ?? "—"}</Text>
          <Text style={styles.meta}>
            Categoria: {driverProfile?.cnhCategory ?? "—"}
          </Text>
          <Text style={styles.meta}>
            Validade: {driverProfile?.cnhValidity ? maskDate(driverProfile.cnhValidity) : "—"}
          </Text>
          <Text style={styles.meta}>
            Anos de habilitação:{" "}
            {driverProfile?.cnhYears != null ? String(driverProfile.cnhYears) : "—"}
          </Text>
          <Text style={styles.meta}>
            EAR: {driverProfile?.cnhHasEar == null ? "—" : driverProfile.cnhHasEar ? "Sim" : "Não"}
          </Text>
          <Text style={styles.meta}>
            Antecedentes:{" "}
            {driverProfile?.criminalAttestation == null
              ? "—"
              : driverProfile.criminalAttestation
                ? "Sim"
                : "Não"}
          </Text>
          <Text style={styles.meta}>
            Uber: {driverProfile?.uberRegistered == null ? "—" : driverProfile.uberRegistered ? "Sim" : "Não"}
          </Text>
        </View>

        <View style={styles.subBlock}>
          <Text style={styles.subTitle}>Endereço</Text>
          <Text style={styles.meta}>CEP: {driverProfile?.cep ?? "—"}</Text>
          <Text style={styles.meta}>Logradouro: {driverProfile?.logradouro ?? "—"}</Text>
          <Text style={styles.meta}>Número: {driverProfile?.numero ?? "—"}</Text>
          <Text style={styles.meta}>Complemento: {driverProfile?.complemento ?? "—"}</Text>
          <Text style={styles.meta}>Bairro: {driverProfile?.bairro ?? "—"}</Text>
          <Text style={styles.meta}>
            Cidade/UF: {[driverProfile?.cidade, driverProfile?.uf].filter(Boolean).join(" / ") || "—"}
          </Text>
        </View>
      </View>

      {row.status === "ACTIVE" ? (
        <AppButton
          title="Efetuar devolução"
          onPress={openReturnModal}
        />
      ) : null}

      {row.status === "REJECTED" && row.driverRequestBlocked ? (
        <AppButton
          title="Permitir nova solicitação"
          variant="ghost"
          loading={unblock.isPending}
          onPress={() => unblock.mutate({ rentalId })}
        />
      ) : row.status === "REJECTED" && !row.driverRequestBlocked ? (
        <Text style={styles.unlockedHint}>
          O motorista já pode enviar uma nova solicitação para este veículo.
        </Text>
      ) : null}

      <AppButton
        title="Voltar"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />

      <Modal
        visible={returnModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setReturnModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardRoot}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              contentContainerStyle={[
                styles.modalScrollContent,
                { paddingBottom: Math.max(insets.bottom, 24) + 16 },
              ]}
            >
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Registrar devolução</Text>
                <Text style={styles.modalHint}>Data devolução (DD/MM/AAAA)</Text>
                <TextInput
                  style={styles.input}
                  value={returnDateStr}
                  onChangeText={(t) => setReturnDateStr(maskDate(t))}
                  placeholder="21/03/2025"
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Text style={styles.modalHint}>Situação</Text>
                <View style={styles.sitRow}>
                  <Pressable
                    style={[
                      styles.sitChip,
                      returnSituation === "LIBERADA" && styles.sitChipOn,
                    ]}
                    onPress={() => setReturnSituation("LIBERADA")}
                  >
                    <Text
                      style={[
                        styles.sitChipText,
                        returnSituation === "LIBERADA" && styles.sitChipTextOn,
                      ]}
                    >
                      Liberada
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.sitChip,
                      returnSituation === "PENDENTE" && styles.sitChipOn,
                    ]}
                    onPress={() => setReturnSituation("PENDENTE")}
                  >
                    <Text
                      style={[
                        styles.sitChipText,
                        returnSituation === "PENDENTE" && styles.sitChipTextOn,
                      ]}
                    >
                      Pendente
                    </Text>
                  </Pressable>
                </View>
                {returnSituation === "PENDENTE" ? (
                  <>
                    <Text style={styles.modalHint}>Motivo da pendência</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={pendingReason}
                      onChangeText={setPendingReason}
                      placeholder="Descreva o motivo"
                      multiline
                    />
                    <Text style={styles.modalHint}>
                      Previsão da solução (DD/MM/AAAA)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={pendingPrevisaoStr}
                      onChangeText={(t) => setPendingPrevisaoStr(maskDate(t))}
                      placeholder="28/03/2025"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </>
                ) : null}
                {returnModalErr ? (
                  <Text style={styles.err}>{returnModalErr}</Text>
                ) : null}
                <View style={styles.modalActions}>
                  <AppButton
                    title="Cancelar"
                    variant="ghost"
                    onPress={() => setReturnModalOpen(false)}
                  />
                  <AppButton
                    title="Confirmar"
                    loading={submitReturn.isPending}
                    onPress={confirmReturn}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  card: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  vehicleTitle: { fontSize: 18, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 2 },
  meta: { fontSize: 13, color: "#64748b" },
  longText: { fontSize: 14, lineHeight: 22, color: "#334155" },
  unlockedHint: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  rejectionNote: {
    fontSize: 14,
    color: "#b45309",
    marginTop: 8,
    lineHeight: 20,
  },
  valueTitle: { fontSize: 16, fontWeight: "700" },
  subBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 4,
  },
  subTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  err: { color: "#dc2626", marginBottom: 12 },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
  },
  modalKeyboardRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    maxHeight: "92%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalHint: { fontSize: 13, color: "#64748b", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  sitRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  sitChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  sitChipOn: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  sitChipText: { fontSize: 15, color: "#64748b", fontWeight: "600" },
  sitChipTextOn: { color: "#1d4ed8" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
});
