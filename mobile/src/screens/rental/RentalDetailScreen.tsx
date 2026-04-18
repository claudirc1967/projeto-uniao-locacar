import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RentalReviewSection } from "../../components/RentalReviewSection";
import { trpc } from "../../api/trpc";
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
    <Button
      mode="outlined"
      icon="map-marker-radius"
      onPress={onPress}
      style={{ marginTop: 12 }}
    >
      Localização do veículo
    </Button>
  );
}

export function RentalDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { rentalId } = route.params;
  const q = trpc.driver.getRentalDetail.useQuery({ rentalId });

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

  const r = q.data!;
  const ownerName =
    r.vehicle.owner?.ownerProfile?.nomeRazaoSocial?.trim() ||
    r.vehicle.owner?.email ||
    "—";
  const showPickup =
    (r.status === "ACTIVE" || r.status === "APPROVED") && r.pickupInstructions;

  const showReturnInfo =
    r.status === "ACTIVE" || r.status === "COMPLETED";

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 20 + insets.bottom },
        ]}
      >
      <Text variant="headlineSmall">{r.vehicle.title}</Text>
      <Text variant="titleMedium" style={{ color: theme.colors.primary, marginVertical: 8 }}>
        {statusLabel[r.status] ?? r.status}
      </Text>
      <Text variant="bodyMedium" style={styles.meta}>
        Marca: {r.vehicle.brand ?? "—"}
      </Text>
      <Text variant="bodyMedium" style={styles.meta}>
        Modelo: {r.vehicle.model ?? "—"}
      </Text>
      <Text variant="bodyMedium" style={styles.meta}>
        Cor: {r.vehicle.cor ?? "—"}
      </Text>
      <Text variant="bodyMedium" style={styles.meta}>
        Portas: {r.vehicle.portas ?? 4} · Lugares: {r.vehicle.lugares ?? 5}
      </Text>
      <Text variant="bodyMedium" style={styles.meta}>
        Placa: {r.vehicle.plate}
      </Text>
      <Text variant="titleSmall" style={styles.ownerLabel}>
        Locador: {ownerName}
      </Text>

      {showReturnInfo ? (
        <Card mode="elevated" style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <Text variant="titleSmall">Situação da locação</Text>
            <Text variant="bodyMedium" style={styles.cardBody}>
              {situationLabel[r.situation] ?? r.situation}
            </Text>
            {r.returnDate ? (
              <Text variant="bodyMedium" style={styles.cardBody}>
                Data devolução: {formatDateDisplay(r.returnDate)}
              </Text>
            ) : null}
            {r.situation === "PENDENTE" && r.pendingReason ? (
              <Text variant="bodyMedium" style={styles.cardBody}>
                Motivo da pendência: {r.pendingReason}
              </Text>
            ) : null}
            {r.situation === "PENDENTE" && r.pendingResolutionExpectedAt ? (
              <Text variant="bodyMedium" style={styles.cardBody}>
                Previsão da solução:{" "}
                {formatDateDisplay(r.pendingResolutionExpectedAt)}
              </Text>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}

      {r.status === "REJECTED" && r.motivoRecusa ? (
        <Card mode="elevated" style={[styles.card, styles.warnCard]}>
          <Card.Content>
            <Text variant="titleSmall">Motivo da recusa</Text>
            <Text variant="bodyMedium" style={styles.cardBody}>
              {r.motivoRecusa}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
      {showPickup ? (
        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall">Como / onde / quando retirar</Text>
            <Text variant="bodyMedium" style={styles.cardBody}>
              {r.pickupInstructions}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
      {r.contractUrl ? (
        <Button
          mode="contained-tonal"
          icon="file-pdf-box"
          onPress={() =>
            Alert.alert("Contrato (PDF)", "O que deseja fazer?", [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Compartilhar PDF",
                onPress: () =>
                  void sharePdfFromUrl(r.contractUrl!, rentalId).catch((e) =>
                    Alert.alert(
                      "Falha",
                      `Não foi possível baixar/compartilhar (${e instanceof Error ? e.message : "erro desconhecido"}).`
                    )
                  ),
              },
              { text: "Abrir link", onPress: () => void Linking.openURL(r.contractUrl!) },
            ])
          }
        >
          Contrato (PDF)
        </Button>
      ) : null}
      <VehicleLocationActions vehicle={r.vehicle} />

      <RentalReviewSection
        rentalId={rentalId}
        review={r.review}
        role="DRIVER"
        title="Como foi com o locador?"
      />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  meta: { marginTop: 4, opacity: 0.85 },
  ownerLabel: {
    marginTop: 16,
    textAlign: "center",
    fontWeight: "700",
  },
  card: { marginTop: 16, borderRadius: 16 },
  infoCard: {
    backgroundColor: "#f0fdf4",
  },
  warnCard: {
    backgroundColor: "#fffbeb",
  },
  cardBody: { marginTop: 8, lineHeight: 22 },
});
