import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OwnerRentalFinanceSection } from "../../components/OwnerRentalFinanceSection";
import { RentalInspectionSection } from "../../components/RentalInspectionSection";
import { RentalReviewSection } from "../../components/RentalReviewSection";
import { trpc } from "../../api/trpc";
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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { rentalId } = route.params;
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const q = trpc.owner.getIncomingRentalDetail.useQuery({ rentalId });
  const inspectionsQ = trpc.rentalInspection.list.useQuery({ rentalId });
  const utils = trpc.useUtils();
  const unblock = trpc.owner.unblockDriverAfterRejection.useMutation({
    onSuccess: async () => {
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      await utils.owner.listIncomingRentals.invalidate();
      await utils.owner.countPendingIncomingRentals.invalidate();
    },
  });

  const submitReturn = trpc.owner.submitRentalReturn.useMutation({
    onSuccess: async () => {
      setReturnModalOpen(false);
      setReturnModalErr(null);
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      await utils.owner.listIncomingRentals.invalidate();
      await utils.owner.countPendingIncomingRentals.invalidate();
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

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollReviewIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

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

  const submitReturnNow = () => {
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
      returnDate: parseDdMmYyyy(returnDateStr)!,
      situation: returnSituation,
      pendingReason:
        returnSituation === "PENDENTE" ? pendingReason.trim() : undefined,
      pendingResolutionExpectedAt: previsao,
    });
  };

  const confirmReturn = () => {
    setReturnModalErr(null);
    const rd = parseDdMmYyyy(returnDateStr);
    if (!rd) {
      setReturnModalErr("Data de devolução inválida. Use DD/MM/AAAA.");
      return;
    }
    if (
      returnSituation === "LIBERADA" &&
      !inspectionsQ.data?.items.some((inspection) => inspection.type === "CHECKIN")
    ) {
      Alert.alert(
        "Vistoria recomendada",
        "A vistoria de devolução ainda não foi feita. Deseja concluir mesmo assim?",
        [
          { text: "Voltar", style: "cancel" },
          { text: "Concluir mesmo assim", onPress: submitReturnNow },
        ]
      );
      return;
    }
    submitReturnNow();
  };

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
          { backgroundColor: theme.colors.background, paddingBottom: insets.bottom },
        ]}
      >
        <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
          {trpcErrorMessage(q.error)}
        </Text>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
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
  const showOperationalSections =
    row.status !== "PENDING_OWNER" && row.status !== "REJECTED";

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: theme.colors.background }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 20) + 180 },
        ]}
      >
      <Card mode="outlined" style={styles.cardWrap}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Solicitação
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Data solicitação: {formatDateTimeDisplay(row.requestedAt)}
          </Text>
          {showApprovalOrRejection ? (
            <Text variant="bodySmall" style={styles.meta}>
              {row.status === "REJECTED"
                ? "Data recusa: "
                : row.status === "COMPLETED"
                  ? "Data conclusão: "
                  : "Data aprovação: "}
              {formatDateTimeDisplay(row.updatedAt)}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={styles.meta}>
            Situação: {statusLabel[row.status] ?? row.status}
          </Text>
          {showSituationBlock ? (
            <>
              <Text variant="bodySmall" style={styles.meta}>
                Situação:{" "}
                {situationLabel[row.situation] ?? row.situation}
              </Text>
              {row.returnDate ? (
                <Text variant="bodySmall" style={styles.meta}>
                  Data devolução: {formatDateDisplay(row.returnDate)}
                </Text>
              ) : null}
              {row.situation === "PENDENTE" && row.pendingReason ? (
                <Text variant="bodySmall" style={styles.meta}>
                  Motivo da pendência: {row.pendingReason}
                </Text>
              ) : null}
              {row.situation === "PENDENTE" && row.pendingResolutionExpectedAt ? (
                <Text variant="bodySmall" style={styles.meta}>
                  Previsão da solução:{" "}
                  {formatDateDisplay(row.pendingResolutionExpectedAt)}
                </Text>
              ) : null}
            </>
          ) : null}
          {row.status === "REJECTED" && row.motivoRecusa ? (
            <Text variant="bodyMedium" style={styles.rejectionNote}>
              Motivo da recusa: {row.motivoRecusa}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <View style={styles.divider} />

      {(row.status === "ACTIVE" || row.status === "APPROVED") &&
      (row.pickupInstructions || row.contractUrl) ? (
        <Card mode="outlined" style={styles.cardWrap}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Retirada e contrato
            </Text>
            {row.pickupInstructions ? (
              <>
                <Text variant="bodySmall" style={styles.meta}>
                  Instruções de retirada
                </Text>
                <Text variant="bodyMedium" style={styles.longText}>
                  {row.pickupInstructions}
                </Text>
              </>
            ) : null}
            {row.contractUrl ? (
              <Button
                mode="contained-tonal"
                style={{ marginTop: 8 }}
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
              >
                Contrato (PDF)
              </Button>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}

      {showOperationalSections ? (
        <>
          <OwnerRentalFinanceSection
            rentalId={rentalId}
            finance={row.financial}
            defaultAmountCents={row.vehicle.dailyRateCents}
          />

          <RentalInspectionSection
            rentalId={rentalId}
            rentalStatus={row.status}
            role="OWNER"
            onEditInspection={(inspectionType) =>
              navigation.navigate("RentalInspectionForm", {
                rentalId,
                type: inspectionType,
              })
            }
          />
        </>
      ) : null}

      <View style={styles.divider} />

      <Card mode="outlined" style={styles.cardWrap}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Veículo
          </Text>
          <Text variant="titleMedium" style={styles.vehicleTitle}>
            {row.vehicle.title}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Placa: {row.vehicle.plate}
          </Text>
          {row.vehicle.brand || row.vehicle.model || row.vehicle.year ? (
            <Text variant="bodySmall" style={styles.meta}>
              {row.vehicle.brand ? row.vehicle.brand : ""}
              {row.vehicle.brand && row.vehicle.model ? " · " : ""}
              {row.vehicle.model ? row.vehicle.model : ""}
              {row.vehicle.year ? ` (${row.vehicle.year})` : ""}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={styles.meta}>
            Cor: {row.vehicle.cor?.trim() || "—"}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Portas: {row.vehicle.portas ?? 4} · Lugares:{" "}
            {row.vehicle.lugares ?? 5}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.divider} />

      <Card mode="outlined" style={styles.cardWrap}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Motorista
          </Text>
          <Text variant="titleSmall" style={styles.valueTitle}>
            {driverProfile?.fullName ?? "—"}
          </Text>
          {driverProfile?.ratingCount && driverProfile.averageRating != null ? (
            <>
              <Text variant="bodySmall" style={styles.meta}>
                ★ {driverProfile.averageRating.toFixed(1).replace(".", ",")} ({driverProfile.ratingCount})
              </Text>
              <Button
                mode="text"
                compact
                onPress={() =>
                  navigation.navigate("UserReviews", {
                    targetUserId: row.driver.id,
                    targetRole: "DRIVER",
                    title: "Avaliações do motorista",
                    displayName: driverProfile.fullName ?? row.driver.email,
                  })
                }
                style={styles.inlineReviewsBtn}
              >
                Ver avaliações do motorista
              </Button>
            </>
          ) : null}
          <Text variant="bodySmall" style={styles.meta}>
            E-mail: {row.driver.email}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Telefone: {driverProfile?.phone ? maskPhone(driverProfile.phone) : "—"}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            CPF: {driverProfile?.cpf ? maskCpf(driverProfile.cpf) : "—"}
          </Text>

          <View style={styles.subBlock}>
            <Text variant="labelLarge" style={styles.subTitle}>
              CNH
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Número: {driverProfile?.cnh ?? "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Categoria: {driverProfile?.cnhCategory ?? "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Validade: {driverProfile?.cnhValidity ? maskDate(driverProfile.cnhValidity) : "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Anos de habilitação:{" "}
              {driverProfile?.cnhYears != null ? String(driverProfile.cnhYears) : "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
            CNH com EAR (Exerce Atividade Remunerada): {driverProfile?.cnhHasEar == null ? "—" : driverProfile.cnhHasEar ? "Sim" : "Não"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Atestado de Antecedentes Criminais *:{" "}
              {driverProfile?.criminalAttestation == null
                ? "—"
                : driverProfile.criminalAttestation
                  ? "Sim"
                  : "Não"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
            Cadastrado no aplicativo (Uber, 99, etc.): {driverProfile?.uberRegistered == null ? "—" : driverProfile.uberRegistered ? "Sim" : "Não"}
            </Text>
          </View>

          <View style={styles.subBlock}>
            <Text variant="labelLarge" style={styles.subTitle}>
              Endereço
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              CEP: {driverProfile?.cep ?? "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Logradouro: {driverProfile?.logradouro ?? "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Número: {driverProfile?.numero ?? "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Complemento: {driverProfile?.complemento ?? "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Bairro: {driverProfile?.bairro ?? "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Cidade/UF: {[driverProfile?.cidade, driverProfile?.uf].filter(Boolean).join(" / ") || "—"}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <RentalReviewSection
        rentalId={rentalId}
        review={row.review}
        role="OWNER"
        title="Como foi com o motorista?"
        onCommentFocus={scrollReviewIntoView}
      />

      {row.status === "ACTIVE" ? (
        <Button mode="contained" onPress={openReturnModal}>
          Efetuar devolução
        </Button>
      ) : null}

      {row.status === "REJECTED" && row.driverRequestBlocked ? (
        <Button
          mode="outlined"
          loading={unblock.isPending}
          onPress={() => unblock.mutate({ rentalId })}
        >
          Permitir nova solicitação
        </Button>
      ) : row.status === "REJECTED" && !row.driverRequestBlocked ? (
        <Text variant="bodyMedium" style={styles.unlockedHint}>
          O motorista já pode enviar uma nova solicitação para este veículo.
        </Text>
      ) : null}

      </ScrollView>
      {!keyboardVisible ? (
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
            Voltar
          </Button>
        </View>
      ) : null}

      <Modal
        visible={returnModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setReturnModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <KeyboardAvoidingView
            style={[styles.modalKeyboardRoot, { paddingBottom: insets.bottom }]}
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
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Registrar devolução
                </Text>
                <Text variant="labelLarge" style={styles.modalHint}>
                  Data devolução (DD/MM/AAAA)
                </Text>
                <TextInput
                  mode="outlined"
                  value={returnDateStr}
                  onChangeText={(t) => setReturnDateStr(maskDate(t))}
                  placeholder="21/03/2025"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={{ backgroundColor: theme.colors.surface }}
                />
                <Text variant="labelLarge" style={[styles.modalHint, { marginTop: 8 }]}>
                  Situação
                </Text>
                <SegmentedButtons
                  value={returnSituation}
                  onValueChange={(v) =>
                    setReturnSituation(v as "LIBERADA" | "PENDENTE")
                  }
                  buttons={[
                    { value: "LIBERADA", label: "Liberada" },
                    { value: "PENDENTE", label: "Pendente" },
                  ]}
                />
                {returnSituation === "PENDENTE" ? (
                  <>
                    <Text variant="labelLarge" style={[styles.modalHint, { marginTop: 8 }]}>
                      Motivo da pendência
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={pendingReason}
                      onChangeText={setPendingReason}
                      placeholder="Descreva o motivo"
                      multiline
                      contentStyle={{ minHeight: 88 }}
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                    <Text variant="labelLarge" style={[styles.modalHint, { marginTop: 8 }]}>
                      Previsão da solução (DD/MM/AAAA)
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={pendingPrevisaoStr}
                      onChangeText={(t) => setPendingPrevisaoStr(maskDate(t))}
                      placeholder="28/03/2025"
                      keyboardType="number-pad"
                      maxLength={10}
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                  </>
                ) : null}
                <HelperText type="error" visible={!!returnModalErr}>
                  {returnModalErr ?? ""}
                </HelperText>
                <View style={styles.modalActions}>
                  <Button mode="text" onPress={() => setReturnModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    mode="contained"
                    loading={submitReturn.isPending}
                    onPress={confirmReturn}
                  >
                    Confirmar
                  </Button>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 20, paddingBottom: 20, gap: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  title: { marginBottom: 2 },
  cardWrap: { marginBottom: 0 },
  cardContent: { gap: 6 },
  sectionTitle: { marginBottom: 6 },
  vehicleTitle: { marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 2 },
  meta: { opacity: 0.85 },
  inlineReviewsBtn: { alignSelf: "flex-start", marginTop: -2 },
  longText: { lineHeight: 22, marginTop: 4 },
  unlockedHint: {
    marginTop: 4,
    opacity: 0.85,
  },
  rejectionNote: {
    color: "#b45309",
    marginTop: 8,
    lineHeight: 20,
  },
  valueTitle: { marginBottom: 4 },
  subBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 4,
  },
  subTitle: { marginBottom: 4 },
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
    borderRadius: 16,
    padding: 20,
    gap: 8,
    maxHeight: "92%",
  },
  modalTitle: { marginBottom: 8 },
  modalHint: { marginTop: 4, opacity: 0.85 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
});
