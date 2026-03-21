import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerRentals">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando você",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

function driverDisplayName(item: {
  driver: {
    email: string;
    driverProfile: { fullName: string | null } | null;
  };
}) {
  const n = item.driver.driverProfile?.fullName?.trim();
  return n ? n : "—";
}

export function OwnerRentalsScreen({ navigation }: Props) {
  const q = trpc.owner.listIncomingRentals.useQuery();
  const utils = trpc.useUtils();
  const approve = trpc.owner.approveRental.useMutation({
    onSuccess: () => void utils.owner.listIncomingRentals.invalidate(),
  });
  const reject = trpc.owner.rejectRental.useMutation({
    onSuccess: () => {
      void utils.owner.listIncomingRentals.invalidate();
      setRejectModalOpen(false);
      setRejectRentalId(null);
      setMotivoRecusa("");
      setModalErr(null);
    },
    onError: (e) => setModalErr(trpcErrorMessage(e)),
  });
  const unblock = trpc.owner.unblockDriverAfterRejection.useMutation({
    onSuccess: () => void utils.owner.listIncomingRentals.invalidate(),
  });
  const [deletingRentalId, setDeletingRentalId] = useState<string | null>(null);
  const deleteRejected = trpc.owner.deleteRejectedRental.useMutation({
    onSuccess: () => {
      setDeletingRentalId(null);
      void utils.owner.listIncomingRentals.invalidate();
    },
    onError: () => setDeletingRentalId(null),
  });

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRentalId, setRejectRentalId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [modalErr, setModalErr] = useState<string | null>(null);

  const openRejectModal = (rentalId: string) => {
    setRejectRentalId(rentalId);
    setMotivoRecusa("");
    setModalErr(null);
    setRejectModalOpen(true);
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

  return (
    <View style={styles.flex}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.title}>Solicitações de locação</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma solicitação.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              onPress={() =>
                navigation.navigate("OwnerRentalDetail", { rentalId: item.id })
              }
            >
              <Text style={styles.veh}>{item.vehicle.title}</Text>
              <Text style={styles.meta}>
                Motorista: {driverDisplayName(item)} ·{" "}
                {statusLabel[item.status] ?? item.status}
              </Text>
            </Pressable>
            {item.status === "PENDING_OWNER" ? (
              <View style={styles.row}>
                <AppButton
                  title="Aprovar"
                  onPress={() => approve.mutate({ rentalId: item.id })}
                  loading={approve.isPending}
                />
                <AppButton
                  title="Recusar"
                  variant="danger"
                  onPress={() => openRejectModal(item.id)}
                  loading={reject.isPending && rejectRentalId === item.id}
                />
              </View>
            ) : null}
            {item.status === "APPROVED" ? (
              <AppButton
                title="Definir retirada e contrato"
                variant="ghost"
                onPress={() =>
                  navigation.navigate("RentalInstructions", {
                    rentalId: item.id,
                  })
                }
              />
            ) : null}
            {item.status === "REJECTED" ? (
              <View style={styles.row}>
                {item.driverRequestBlocked ? (
                  <AppButton
                    title="Permitir nova solicitação"
                    variant="ghost"
                    onPress={() => unblock.mutate({ rentalId: item.id })}
                    loading={unblock.isPending}
                  />
                ) : (
                  <View style={styles.hintWrap}>
                    <Text style={styles.unlockedHint}>
                      O motorista já pode solicitar novamente este veículo.
                    </Text>
                  </View>
                )}
                <AppButton
                  title="Excluir"
                  variant="danger"
                  onPress={() => {
                    Alert.alert(
                      "Tem certeza?",
                      "Deseja excluir esta solicitação recusada?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Excluir",
                          style: "destructive",
                          onPress: () => {
                            setDeletingRentalId(item.id);
                            deleteRejected.mutate({ rentalId: item.id });
                          },
                        },
                      ]
                    );
                  }}
                  loading={deleteRejected.isPending && deletingRentalId === item.id}
                />
              </View>
            ) : null}
          </View>
        )}
      />
      <AppButton
        title="Voltar"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />

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
            style={styles.modalKeyboard}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Motivo da recusa</Text>
              <Text style={styles.modalHint}>
                Descreva o motivo para o motorista (obrigatório).
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex.: Veículo indisponível no período..."
                placeholderTextColor="#94a3b8"
                value={motivoRecusa}
                onChangeText={(t) => {
                  setMotivoRecusa(t);
                  setModalErr(null);
                }}
                multiline
                editable={!reject.isPending}
              />
              {modalErr ? (
                <Text style={styles.modalErr}>{modalErr}</Text>
              ) : null}
              <View style={styles.modalRow}>
                <AppButton
                  title="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    if (!reject.isPending) {
                      setRejectModalOpen(false);
                      setRejectRentalId(null);
                      setMotivoRecusa("");
                      setModalErr(null);
                    }
                  }}
                />
                <AppButton
                  title="Confirmar recusa"
                  variant="danger"
                  loading={reject.isPending}
                  onPress={confirmReject}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  veh: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#64748b" },
  row: { flexDirection: "row", gap: 8, marginTop: 4 },
  empty: { color: "#94a3b8", marginTop: 24 },
  err: { color: "#dc2626" },
  unlockedHint: {
    fontSize: 13,
    color: "#64748b",
  },
  hintWrap: { flex: 1, justifyContent: "center" },
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalHint: { fontSize: 13, color: "#64748b" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 16,
  },
  modalErr: { color: "#dc2626", fontSize: 13 },
  modalRow: { flexDirection: "row", gap: 8, marginTop: 8 },
});
