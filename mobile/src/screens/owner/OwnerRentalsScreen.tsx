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
  View,
} from "react-native";
import { Button, Card, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
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
    driverProfile: { fullName: string | null } | null;
  };
}) {
  const n = item.driver.driverProfile?.fullName?.trim();
  return n ? n : "—";
}

export function OwnerRentalsScreen({ navigation }: Props) {
  const theme = useTheme();
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
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text variant="headlineSmall" style={styles.listTitle}>
            Solicitações de locação
          </Text>
        }
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhuma solicitação.
          </Text>
        }
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardGap}>
              <Pressable
                onPress={() =>
                  navigation.navigate("OwnerRentalDetail", { rentalId: item.id })
                }
              >
                <Text variant="titleMedium">{item.vehicle.title}</Text>
                <Text variant="bodySmall" style={styles.meta}>
                  Motorista: {driverDisplayName(item)} ·{" "}
                  {statusLabel[item.status] ?? item.status}
                </Text>
              </Pressable>
              {item.status === "PENDING_OWNER" ? (
                <View style={styles.row}>
                  <Button
                    mode="contained"
                    compact
                    onPress={() => approve.mutate({ rentalId: item.id })}
                    loading={approve.isPending}
                  >
                    Aprovar
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onError}
                    compact
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
                  Definir retirada e contrato
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
      <View style={styles.footer}>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>

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
  list: { paddingBottom: 24 },
  listTitle: { marginBottom: 16 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardGap: { gap: 8 },
  meta: { marginTop: 4, opacity: 0.85 },
  row: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" },
  empty: { marginTop: 24, opacity: 0.7 },
  unlockedHint: { color: "#64748b" },
  hintWrap: { flex: 1, justifyContent: "center" },
  footer: { padding: 16, paddingBottom: 24 },
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
