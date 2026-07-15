import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { vehicleTypeLabel } from "../../constants/vehicleType";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import {
  formatDateTimeDisplay,
  maskCpf,
  maskDate,
  maskPhone,
} from "../../utils/masks";
import { formatVehicleCapacityLine } from "../../utils/vehicleDisplay";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminRentalDetail">;

const DEFAULT_MOTIVO =
  "Locador não respondeu no prazo. A solicitação foi encerrada pela plataforma.";

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando locador",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export function AdminRentalDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rentalId } = route.params;
  const utils = trpc.useUtils();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState(DEFAULT_MOTIVO);
  const [modalErr, setModalErr] = useState<string | null>(null);

  const q = trpc.admin.rentals.getDetail.useQuery(
    { rentalId },
    { enabled: user?.role === "ADMIN" }
  );

  const reject = trpc.admin.rentals.rejectRental.useMutation({
    onSuccess: async () => {
      setRejectOpen(false);
      setModalErr(null);
      await Promise.all([
        utils.admin.rentals.getDetail.invalidate({ rentalId }),
        utils.admin.rentals.listPendingOlderThan.invalidate(),
        utils.admin.rentals.countPendingOlderThan.invalidate(),
      ]);
    },
    onError: (e) => setModalErr(trpcErrorMessage(e)),
  });

  const openReject = () => {
    setMotivoRecusa(DEFAULT_MOTIVO);
    setModalErr(null);
    setRejectOpen(true);
  };

  const confirmReject = () => {
    const t = motivoRecusa.trim();
    if (t.length < 3) {
      setModalErr("Informe o motivo (mínimo 3 caracteres).");
      return;
    }
    setModalErr(null);
    reject.mutate({ rentalId, motivoRecusa: t });
  };

  if (q.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background, paddingBottom: insets.bottom },
        ]}
      >
        <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
          {q.error ? trpcErrorMessage(q.error) : "Solicitação não encontrada."}
        </Text>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    );
  }

  const row = q.data;
  const driverProfile = row.driver.driverProfile;
  const canReject = row.status === "PENDING_OWNER";

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 88 + insets.bottom },
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
            <Text variant="bodySmall" style={styles.meta}>
              Situação: {statusLabel[row.status] ?? row.status}
              {row.rejectedByAdmin ? " (encerrada pelo admin)" : ""}
            </Text>
            {row.status === "REJECTED" && row.motivoRecusa ? (
              <Text variant="bodySmall" style={styles.meta}>
                Motivo: {row.motivoRecusa}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <View style={styles.divider} />

        <Card mode="outlined" style={styles.cardWrap}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Locador
            </Text>
            <Text variant="titleSmall" style={styles.valueTitle}>
              {row.owner.nomeRazaoSocial || "—"}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              E-mail: {row.owner.emailLocador || row.owner.email}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Telefone: {row.owner.phone ? maskPhone(row.owner.phone) : "—"}
            </Text>
          </Card.Content>
        </Card>

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
              Tipo: {vehicleTypeLabel(row.vehicle.vehicleType)}
            </Text>
            {formatVehicleCapacityLine(
              row.vehicle.vehicleType,
              row.vehicle.portas,
              row.vehicle.lugares
            ) ? (
              <Text variant="bodySmall" style={styles.meta}>
                {formatVehicleCapacityLine(
                  row.vehicle.vehicleType,
                  row.vehicle.portas,
                  row.vehicle.lugares
                )}
              </Text>
            ) : null}
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
            <Text variant="bodySmall" style={styles.meta}>
              E-mail: {row.driver.email}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Telefone:{" "}
              {driverProfile?.phone ? maskPhone(driverProfile.phone) : "—"}
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
                Validade:{" "}
                {driverProfile?.cnhValidity
                  ? maskDate(driverProfile.cnhValidity)
                  : "—"}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Anos de habilitação:{" "}
                {driverProfile?.cnhYears != null
                  ? String(driverProfile.cnhYears)
                  : "—"}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                CNH com EAR (Exerce Atividade Remunerada):{" "}
                {driverProfile?.cnhHasEar == null
                  ? "—"
                  : driverProfile.cnhHasEar
                    ? "Sim"
                    : "Não"}
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
                Cadastrado no aplicativo (Uber, 99, etc.):{" "}
                {driverProfile?.uberRegistered == null
                  ? "—"
                  : driverProfile.uberRegistered
                    ? "Sim"
                    : "Não"}
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
                Cidade/UF:{" "}
                {[driverProfile?.cidade, driverProfile?.uf]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <View
        style={[
          styles.footerBar,
          {
            paddingBottom: insets.bottom,
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View style={styles.footerRow}>
          <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
            Voltar
          </Button>
          {canReject ? (
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              icon="close-circle-outline"
              onPress={openReject}
            >
              Recusar (admin)
            </Button>
          ) : null}
        </View>
      </View>

      <Modal
        visible={rejectOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!reject.isPending) setRejectOpen(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!reject.isPending) setRejectOpen(false);
          }}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="titleMedium" style={styles.modalTitle}>
              Encerrar solicitação
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
            >
              O motorista será notificado. Ele poderá solicitar este veículo de
              novo (não há bloqueio).
            </Text>
            <TextInput
              mode="outlined"
              label="Motivo"
              value={motivoRecusa}
              onChangeText={setMotivoRecusa}
              multiline
              numberOfLines={4}
              style={styles.motivoInput}
            />
            {modalErr ? (
              <Text style={{ color: theme.colors.error, marginBottom: 8 }}>
                {modalErr}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                disabled={reject.isPending}
                onPress={() => setRejectOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                buttonColor={theme.colors.error}
                textColor={theme.colors.onError}
                loading={reject.isPending}
                disabled={reject.isPending}
                onPress={confirmReject}
              >
                Confirmar recusa
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 20, gap: 14 },
  cardWrap: { marginBottom: 0 },
  cardContent: { gap: 6 },
  sectionTitle: { marginBottom: 6 },
  vehicleTitle: { marginBottom: 4 },
  valueTitle: { marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 2 },
  meta: { opacity: 0.85 },
  subBlock: { marginTop: 12, gap: 4 },
  subTitle: { marginBottom: 4 },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { marginBottom: 8 },
  motivoInput: { marginBottom: 12, minHeight: 100 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
});
