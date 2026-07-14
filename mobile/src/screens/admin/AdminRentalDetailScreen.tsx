import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
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

  const q = trpc.admin.rentals.getDetail.useQuery(
    { rentalId },
    { enabled: user?.role === "ADMIN" }
  );

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

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 72 + insets.bottom },
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
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
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
});
