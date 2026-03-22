import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import { formatDateDisplay } from "../../utils/masks";
import {
  buildVehiclePickupSearchQuery,
  googleMapsSearchUrl,
  type VehiclePickupFields,
  wazeSearchUrl,
} from "../../utils/vehicleLocationLinks";

type Props = NativeStackScreenProps<RootStackParamList, "RentalDetail">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando proprietário",
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

function VehicleLocationActions({ vehicle }: { vehicle: VehiclePickupFields }) {
  const query = buildVehiclePickupSearchQuery(vehicle);
  if (!query) return null;

  const googleUrl = googleMapsSearchUrl(query);
  const wazeUrl = wazeSearchUrl(query);

  const copyLink = async () => {
    await Clipboard.setStringAsync(googleUrl);
    Alert.alert(
      "Copiado",
      "O link do Google Maps foi copiado para a área de transferência."
    );
  };

  const openMaps = () => void Linking.openURL(googleUrl);
  const openWaze = () => void Linking.openURL(wazeUrl);

  const onPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancelar", "Google Maps", "Waze", "Copiar link"],
          cancelButtonIndex: 0,
          title: "Localização do veículo",
          message: query,
        },
        (i) => {
          if (i === 1) openMaps();
          else if (i === 2) openWaze();
          else if (i === 3) void copyLink();
        }
      );
    } else {
      Alert.alert("Localização do veículo", query, [
        { text: "Cancelar", style: "cancel" },
        { text: "Google Maps", onPress: openMaps },
        {
          text: "Mais opções",
          onPress: () =>
            Alert.alert("Outras opções", undefined, [
              { text: "Voltar", style: "cancel" },
              { text: "Waze", onPress: openWaze },
              { text: "Copiar link", onPress: () => void copyLink() },
            ]),
        },
      ]);
    }
  };

  return (
    <AppButton
      title="Localização do veículo"
      onPress={onPress}
      style={{ marginTop: 12 }}
    />
  );
}

export function RentalDetailScreen({ route }: Props) {
  const { rentalId } = route.params;
  const q = trpc.driver.getRentalDetail.useQuery({ rentalId });

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

  const r = q.data!;
  const showPickup =
    (r.status === "ACTIVE" || r.status === "APPROVED") && r.pickupInstructions;

  const showReturnInfo =
    r.status === "ACTIVE" || r.status === "COMPLETED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{r.vehicle.title}</Text>
      <Text style={styles.badge}>
        {statusLabel[r.status] ?? r.status}
      </Text>
      <Text style={styles.meta}>Marca: {r.vehicle.brand ?? "—"}</Text>
      <Text style={styles.meta}>Modelo: {r.vehicle.model ?? "—"}</Text>
      <Text style={styles.meta}>Cor: {r.vehicle.cor ?? "—"}</Text>
      <Text style={styles.meta}>Placa: {r.vehicle.plate}</Text>

      {showReturnInfo ? (
        <View style={[styles.box, styles.infoBox]}>
          <Text style={styles.boxTitle}>Situação da locação</Text>
          <Text style={styles.boxBody}>
            {situationLabel[r.situation] ?? r.situation}
          </Text>
          {r.returnDate ? (
            <Text style={styles.boxBody}>
              Data devolução: {formatDateDisplay(r.returnDate)}
            </Text>
          ) : null}
          {r.situation === "PENDENTE" && r.pendingReason ? (
            <Text style={styles.boxBody}>
              Motivo da pendência: {r.pendingReason}
            </Text>
          ) : null}
          {r.situation === "PENDENTE" && r.pendingResolutionExpectedAt ? (
            <Text style={styles.boxBody}>
              Previsão da solução:{" "}
              {formatDateDisplay(r.pendingResolutionExpectedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {r.status === "REJECTED" && r.motivoRecusa ? (
        <View style={[styles.box, styles.rejectionBox]}>
          <Text style={styles.boxTitle}>Motivo da recusa</Text>
          <Text style={styles.boxBody}>{r.motivoRecusa}</Text>
        </View>
      ) : null}
      {showPickup ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Como / onde / quando retirar</Text>
          <Text style={styles.boxBody}>{r.pickupInstructions}</Text>
        </View>
      ) : null}
      {r.contractText ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Contrato</Text>
          <Text style={styles.boxBody}>{r.contractText}</Text>
        </View>
      ) : null}
      {r.contractUrl ? (
        <AppButton
          title="Abrir link do contrato"
          onPress={() => void Linking.openURL(r.contractUrl!)}
        />
      ) : null}
      <VehicleLocationActions vehicle={r.vehicle} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700" },
  badge: { fontSize: 16, color: "#2563eb", marginVertical: 8 },
  meta: { color: "#64748b" },
  box: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoBox: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  boxTitle: { fontWeight: "600", marginBottom: 8 },
  boxBody: { fontSize: 15, lineHeight: 22, color: "#334155" },
  rejectionBox: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  err: { color: "#dc2626" },
});
