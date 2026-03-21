import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import {
  formatDateTimeDisplay,
  maskCpf,
  maskDate,
  maskPhone,
} from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerRentalDetail">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando você",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

export function OwnerRentalDetailScreen({ navigation, route }: Props) {
  const { rentalId } = route.params;
  const q = trpc.owner.getIncomingRentalDetail.useQuery({ rentalId });
  const utils = trpc.useUtils();
  const unblock = trpc.owner.unblockDriverAfterRejection.useMutation({
    onSuccess: async () => {
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      await utils.owner.listIncomingRentals.invalidate();
    },
  });

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

  const r = q.data!;
  const driverProfile = r.driver.driverProfile;

  const showApprovalOrRejection =
    r.status === "APPROVED" || r.status === "ACTIVE" || r.status === "REJECTED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Detalhes da solicitação</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Solicitação</Text>
        <Text style={styles.meta}>
          Data solicitação: {formatDateTimeDisplay(r.requestedAt)}
        </Text>
        {showApprovalOrRejection ? (
          <Text style={styles.meta}>
            {r.status === "REJECTED" ? "Data recusa: " : "Data aprovação: "}
            {formatDateTimeDisplay(r.updatedAt)}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          Status: {statusLabel[r.status] ?? r.status}
        </Text>
        {r.status === "REJECTED" && r.motivoRecusa ? (
          <Text style={styles.rejectionNote}>
            Motivo da recusa: {r.motivoRecusa}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Veículo</Text>
        <Text style={styles.vehicleTitle}>{r.vehicle.title}</Text>
        <Text style={styles.meta}>
          Placa: {r.vehicle.plate}
        </Text>
        {r.vehicle.brand || r.vehicle.model || r.vehicle.year ? (
          <Text style={styles.meta}>
            {r.vehicle.brand ? r.vehicle.brand : ""}
            {r.vehicle.brand && r.vehicle.model ? " · " : ""}
            {r.vehicle.model ? r.vehicle.model : ""}
            {r.vehicle.year ? ` (${r.vehicle.year})` : ""}
          </Text>
        ) : null}
        <Text style={styles.meta}>Cor: {r.vehicle.cor?.trim() || "—"}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Motorista</Text>
        <Text style={styles.valueTitle}>{driverProfile?.fullName ?? "—"}</Text>
        <Text style={styles.meta}>E-mail: {r.driver.email}</Text>
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

      {r.status === "REJECTED" && r.driverRequestBlocked ? (
        <AppButton
          title="Permitir nova solicitação"
          variant="ghost"
          loading={unblock.isPending}
          onPress={() => unblock.mutate({ rentalId })}
        />
      ) : r.status === "REJECTED" && !r.driverRequestBlocked ? (
        <Text style={styles.unlockedHint}>
          O motorista já pode enviar uma nova solicitação para este veículo.
        </Text>
      ) : null}

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
  title: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  card: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  vehicleTitle: { fontSize: 18, fontWeight: "700" },
  sectionMeta: { color: "#64748b" },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 2 },
  meta: { fontSize: 13, color: "#64748b" },
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
});

