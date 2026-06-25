import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import { appAlert } from "../../utils/appAlert";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerRentals">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando você",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

function driverDisplayName(item: {
  driver: {
    email: string;
    driverProfile:
      | { fullName: string | null; averageRating: number | null; ratingCount: number }
      | null;
  };
}) {
  const n = item.driver.driverProfile?.fullName?.trim();
  return n ? n : "—";
}

function driverRatingLine(item: {
  driver: {
    driverProfile:
      | { averageRating: number | null; ratingCount: number }
      | null;
  };
}) {
  const p = item.driver.driverProfile;
  if (!p || !p.ratingCount || p.averageRating == null) return null;
  const avg = p.averageRating.toFixed(1).replace(".", ",");
  return `★ ${avg} (${p.ratingCount})`;
}

export function OwnerRentalsScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const q = trpc.owner.listIncomingRentals.useQuery();
  const utils = trpc.useUtils();
  const invalidateRentals = () => {
    void utils.owner.listIncomingRentals.invalidate();
    void utils.owner.countPendingIncomingRentals.invalidate();
  };
  const approve = trpc.owner.approveRental.useMutation({
    onSuccess: () => {
      invalidateRentals();
      setApproveModalOpen(false);
      setApproveRentalId(null);
      setPickupInstructions("");
      setApproveErr(null);
    },
    onError: (e) => setApproveErr(trpcErrorMessage(e)),
  });
  const reject = trpc.owner.rejectRental.useMutation({
    onSuccess: () => {
      invalidateRentals();
      setRejectModalOpen(false);
      setRejectRentalId(null);
      setMotivoRecusa("");
      setModalErr(null);
    },
    onError: (e) => setModalErr(trpcErrorMessage(e)),
  });
  const unblock = trpc.owner.unblockDriverAfterRejection.useMutation({
    onSuccess: invalidateRentals,
  });
  const [deletingRentalId, setDeletingRentalId] = useState<string | null>(null);
  const deleteRejected = trpc.owner.deleteRejectedRental.useMutation({
    onSuccess: () => {
      setDeletingRentalId(null);
      invalidateRentals();
    },
    onError: () => setDeletingRentalId(null),
  });

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveRentalId, setApproveRentalId] = useState<string | null>(null);
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [approveErr, setApproveErr] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRentalId, setRejectRentalId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [modalErr, setModalErr] = useState<string | null>(null);

  const openApproveModal = (rentalId: string) => {
    setApproveRentalId(rentalId);
    setPickupInstructions("");
    setApproveErr(null);
    setApproveModalOpen(true);
  };

  const closeApproveModal = () => {
    if (approve.isPending) return;
    setApproveModalOpen(false);
    setApproveRentalId(null);
    setPickupInstructions("");
    setApproveErr(null);
  };

  const openRejectModal = (rentalId: string) => {
    setRejectRentalId(rentalId);
    setMotivoRecusa("");
    setModalErr(null);
    setRejectModalOpen(true);
  };

  const confirmApprove = () => {
    const instructions = pickupInstructions.trim();
    if (instructions.length < 3) {
      setApproveErr("Informe as instruções de retirada (mínimo 3 caracteres).");
      return;
    }
    if (!approveRentalId) return;
    setApproveErr(null);
    approve.mutate({ rentalId: approveRentalId, pickupInstructions: instructions });
  };

  const confirmReject = () => {
    const t = motivoRecusa.trim();
    if (t.length < 3) {
      setModalErr("Informe o motivo da recusa (mínimo 3 caracteres).");
      return;
    }
    if (!rejectRentalId) return;
    setModalErr(null);
    reject.mutate({ rentalId: rejectRentalId, motivoRecusa: t });
  };

  const confirmDeleteRejected = (rentalId: string) => {
    const message =
      "Deseja excluir esta solicitação recusada? O motorista poderá solicitar este veículo novamente.";
    const runDelete = () => {
      setDeletingRentalId(rentalId);
      deleteRejected.mutate({ rentalId });
    };
    appAlert("Tem certeza?", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: runDelete },
    ]);
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
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>{trpcErrorMessage(q.error)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 8 + insets.bottom },
        ]}
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhuma solicitação.
          </Text>
        }
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardGap}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text variant="titleMedium">{item.vehicle.title}</Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    Motorista: {driverDisplayName(item)}
                  </Text>
                  {driverRatingLine(item) ? (
                    <Text variant="bodySmall" style={styles.meta}>
                      {driverRatingLine(item)}
                    </Text>
                  ) : null}
                </View>
                <Chip compact mode="flat" style={styles.statusChip}>
                  {statusLabel[item.status] ?? item.status}
                </Chip>
              </View>
              <Text variant="bodySmall" style={styles.detailHint}>
                Veja dados do motorista, veículo, contrato, vistoria e financeiro.
              </Text>
              <Button
                mode="outlined"
                icon="eye-outline"
                onPress={() =>
                  navigation.navigate("OwnerRentalDetail", { rentalId: item.id })
                }
                style={styles.detailsButton}
              >
                Ver detalhes da solicitação
              </Button>
              {item.status === "PENDING_OWNER" ? (
                <View style={styles.primaryActionsRow}>
                  <Button
                    mode="contained"
                    compact
                    style={styles.actionButton}
                    onPress={() => openApproveModal(item.id)}
                    loading={approve.isPending && approveRentalId === item.id}
                  >
                    Aprovar
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onError}
                    compact
                    style={styles.actionButton}
                    onPress={() => openRejectModal(item.id)}
                    loading={reject.isPending && rejectRentalId === item.id}
                  >
                    Recusar
                  </Button>
                </View>
              ) : null}
              {item.status === "APPROVED" ? (
                <Button
                  mode="outlined"
                  onPress={() =>
                    navigation.navigate("RentalInstructions", {
                      rentalId: item.id,
                    })
                  }
                >
                  Contrato e ativação
                </Button>
              ) : null}
              {item.status === "REJECTED" ? (
                <View style={styles.row}>
                  {item.driverRequestBlocked ? (
                    <Button
                      mode="text"
                      compact
                      onPress={() => unblock.mutate({ rentalId: item.id })}
                      loading={unblock.isPending}
                    >
                      Permitir nova solicitação
                    </Button>
                  ) : (
                    <View style={styles.hintWrap}>
                      <Text variant="bodySmall" style={styles.unlockedHint}>
                        O motorista já pode solicitar novamente este veículo.
                      </Text>
                    </View>
                  )}
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onError}
                    compact
                    onPress={() => confirmDeleteRejected(item.id)}
                    loading={
                      deleteRejected.isPending && deletingRentalId === item.id
                    }
                  >
                    Excluir
                  </Button>
                </View>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>

      <Modal
        visible={approveModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeApproveModal}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeApproveModal}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[styles.modalKeyboard, { paddingBottom: 20 + insets.bottom }]}
          >
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
              <Text variant="titleLarge">Aprovar solicitação</Text>
              <Text variant="bodySmall" style={styles.modalHint}>
                Informe onde, quando e como o motorista deve retirar o veículo.
                Essas instruções aparecerão para ele assim que a solicitação for aprovada.
              </Text>
              <TextInput
                mode="outlined"
                placeholder="Ex.: Retirar na garagem da Rua X, nº 123, amanhã às 10h. Levar CNH original."
                value={pickupInstructions}
                onChangeText={(t) => {
                  setPickupInstructions(t);
                  setApproveErr(null);
                }}
                multiline
                editable={!approve.isPending}
                style={styles.modalInput}
              />
              <HelperText type="error" visible={!!approveErr}>
                {approveErr ?? ""}
              </HelperText>
              <View style={styles.modalRow}>
                <Button mode="text" onPress={closeApproveModal}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  loading={approve.isPending}
                  disabled={approve.isPending}
                  onPress={confirmApprove}
                >
                  Aprovar e enviar instruções
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={rejectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!reject.isPending) {
            setRejectModalOpen(false);
            setRejectRentalId(null);
            setMotivoRecusa("");
            setModalErr(null);
          }
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!reject.isPending) {
                setRejectModalOpen(false);
                setRejectRentalId(null);
                setMotivoRecusa("");
                setModalErr(null);
              }
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[styles.modalKeyboard, { paddingBottom: 20 + insets.bottom }]}
          >
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
              <Text variant="titleLarge">Motivo da recusa</Text>
              <Text variant="bodySmall" style={styles.modalHint}>
                Descreva o motivo para o motorista (obrigatório).
              </Text>
              <TextInput
                mode="outlined"
                placeholder="Ex.: Veículo indisponível no período..."
                value={motivoRecusa}
                onChangeText={(t) => {
                  setMotivoRecusa(t);
                  setModalErr(null);
                }}
                multiline
                editable={!reject.isPending}
                style={styles.modalInput}
              />
              <HelperText type="error" visible={!!modalErr}>
                {modalErr ?? ""}
              </HelperText>
              <View style={styles.modalRow}>
                <Button
                  mode="text"
                  onPress={() => {
                    if (!reject.isPending) {
                      setRejectModalOpen(false);
                      setRejectRentalId(null);
                      setMotivoRecusa("");
                      setModalErr(null);
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  loading={reject.isPending}
                  onPress={confirmReject}
                >
                  Confirmar recusa
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingBottom: 16 },
  listTitle: { marginBottom: 16 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardGap: { gap: 10 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleWrap: { flex: 1 },
  meta: { marginTop: 4, opacity: 0.85 },
  statusChip: { alignSelf: "flex-start" },
  detailHint: { color: "#64748b", lineHeight: 18 },
  detailsButton: { alignSelf: "stretch" },
  primaryActionsRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  actionButton: { flex: 1 },
  row: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" },
  empty: { marginTop: 24, opacity: 0.7 },
  unlockedHint: { color: "#64748b" },
  hintWrap: { flex: 1, justifyContent: "center" },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  modalKeyboard: {
    padding: 20,
    zIndex: 1,
  },
  modalBox: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalHint: { opacity: 0.85 },
  modalInput: { minHeight: 100, backgroundColor: "#fff" },
  modalRow: { flexDirection: "row", gap: 8, marginTop: 8, justifyContent: "flex-end", flexWrap: "wrap" },
});
