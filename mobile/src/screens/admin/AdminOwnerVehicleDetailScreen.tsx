import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Divider, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  effectiveHighlightTier,
  highlightTierLabel,
} from "../../constants/highlightTier";
import { vehicleTypeLabel } from "../../constants/vehicleType";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import {
  type ContractTime,
  formatDateDisplay,
  formatMoneyWithContractPeriod,
} from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminOwnerVehicleDetail">;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="labelLarge" style={styles.fieldLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

export function AdminOwnerVehicleDetailScreen({ route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { vehicleId } = route.params;

  const vehicleQ = trpc.admin.owners.getVehicle.useQuery(
    { vehicleId },
    { enabled: user?.role === "ADMIN" }
  );

  if (vehicleQ.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (vehicleQ.isError || !vehicleQ.data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {trpcErrorMessage(vehicleQ.error, "Veículo não encontrado.")}
        </Text>
      </View>
    );
  }

  const v = vehicleQ.data;
  const tier = effectiveHighlightTier({
    highlightTier: v.highlightTier,
    highlightExpiresAt: v.highlightExpiresAt,
  });
  const pickup =
    v.pickupCity && v.pickupUf
      ? `${v.pickupCity}/${v.pickupUf}`
      : v.pickupSameAsOwner
        ? "Mesmo endereço do locador"
        : "—";

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: 16 + insets.bottom },
      ]}
    >
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Somente visualização — dados do locador {v.ownerName}
      </Text>

      {v.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {v.photos.map((p) =>
            p.photoUrl ? (
              <Image key={p.id} source={{ uri: p.photoUrl }} style={styles.photo} />
            ) : null
          )}
        </ScrollView>
      ) : (
        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium">Sem fotos cadastradas.</Text>
          </Card.Content>
        </Card>
      )}

      <Card mode="elevated" style={styles.card}>
        <Card.Title title={v.title} subtitle={v.plate} />
        <Card.Content style={styles.gap}>
          <Field
            label="Locador"
            value={`${v.ownerName} (${v.ownerEmail})`}
          />
          <Field
            label="Marca / modelo / ano"
            value={`${v.brand ?? "—"} ${v.model ?? ""} · ${v.year}`.trim()}
          />
          <Field label="Cor" value={v.cor?.trim() || "—"} />
          <Field label="Tipo" value={vehicleTypeLabel(v.vehicleType)} />
          <Field
            label="Valor"
            value={formatMoneyWithContractPeriod(
              v.dailyRateCents,
              v.contractTime as ContractTime
            )}
          />
          <Field
            label="Disponibilidade"
            value={v.available ? "Disponível no marketplace" : "Indisponível"}
          />
          <Field
            label="Destaque"
            value={
              tier !== "NORMAL"
                ? `${highlightTierLabel(tier)}${
                    v.highlightExpiresAt
                      ? ` até ${formatDateDisplay(v.highlightExpiresAt)}`
                      : ""
                  }`
                : "Padrão"
            }
          />
          <Divider />
          <Field
            label="Locações"
            value={`${v.activeRentalsCount} ativa(s) · ${v.totalRentalsCount} no total`}
          />
          <Field label="Retirada" value={pickup} />
          <Field label="Caução" value={v.caucao?.trim() || "—"} />
          <Field
            label="KM"
            value={
              v.kmLivre
                ? "KM livre"
                : v.kmPorContrato > 0
                  ? `${v.kmPorContrato} km por contrato`
                  : "—"
            }
          />
          <Field
            label="Seguro/manutenção inclusos"
            value={v.insuranceMaintenanceIncluded ? "Sim" : "Não"}
          />
          {v.paymentNotes?.trim() ? (
            <Field label="Observações de pagamento" value={v.paymentNotes.trim()} />
          ) : null}
          {v.description?.trim() ? (
            <Field label="Descrição" value={v.description.trim()} />
          ) : null}
          <Field label="Atualizado em" value={formatDateDisplay(v.updatedAt)} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  container: { padding: 16, gap: 12 },
  card: { borderRadius: 16 },
  gap: { gap: 12 },
  field: { gap: 4 },
  fieldLabel: { opacity: 0.85, fontWeight: "700" },
  gallery: { marginHorizontal: -4 },
  photo: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: "#f1f5f9",
  },
});
