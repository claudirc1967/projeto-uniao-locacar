import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RentalInspectionSection } from "../../components/RentalInspectionSection";
import { RentalReviewSection } from "../../components/RentalReviewSection";
import { VehicleLocationActions } from "../../components/VehicleLocationActions";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import { formatDateDisplay, maskPhone, onlyDigits } from "../../utils/masks";
import { vehicleTypeLabel } from "../../constants/vehicleType";
import { formatVehicleCapacityLine } from "../../utils/vehicleDisplay";

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

export function RentalDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { rentalId } = route.params;
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const q = trpc.driver.getRentalDetail.useQuery({ rentalId });

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
  const ownerPhone = r.vehicle.owner?.ownerProfile?.phone?.trim() || "";
  const ownerPhoneDigits = onlyDigits(ownerPhone);
  const whatsappPhone = ownerPhoneDigits
    ? ownerPhoneDigits.startsWith("55")
      ? ownerPhoneDigits
      : `55${ownerPhoneDigits}`
    : "";
  const showPickup =
    (r.status === "ACTIVE" || r.status === "APPROVED") && r.pickupInstructions;

  const showReturnInfo =
    r.status === "ACTIVE" || r.status === "COMPLETED";

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
          { paddingBottom: Math.max(insets.bottom, 20) + 140 },
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
        Tipo: {vehicleTypeLabel(r.vehicle.vehicleType)}
      </Text>
      {formatVehicleCapacityLine(
        r.vehicle.vehicleType,
        r.vehicle.portas,
        r.vehicle.lugares
      ) ? (
        <Text variant="bodyMedium" style={styles.meta}>
          {formatVehicleCapacityLine(
            r.vehicle.vehicleType,
            r.vehicle.portas,
            r.vehicle.lugares
          )}
        </Text>
      ) : null}
      <Text variant="bodyMedium" style={styles.meta}>
        Placa: {r.vehicle.plate}
      </Text>
      <Text variant="titleSmall" style={styles.ownerLabel}>
        Locador: {ownerName}
      </Text>
      {ownerPhoneDigits ? (
        <>
          <Text variant="bodyMedium" style={styles.ownerPhone}>
            Telefone/WhatsApp: {maskPhone(ownerPhone)}
          </Text>
          <Button
            mode="outlined"
            icon="whatsapp"
            style={styles.whatsappButton}
            onPress={() => void Linking.openURL(`https://wa.me/${whatsappPhone}`)}
          >
            Chamar no WhatsApp
          </Button>
        </>
      ) : null}

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

      <RentalInspectionSection
        rentalId={rentalId}
        rentalStatus={r.status}
        role="DRIVER"
      />

      <RentalReviewSection
        rentalId={rentalId}
        review={r.review}
        role="DRIVER"
        title="Como foi com o locador?"
        onCommentFocus={scrollReviewIntoView}
      />
      </ScrollView>
      {!keyboardVisible ? (
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
            Voltar
          </Button>
        </View>
      ) : null}
    </KeyboardAvoidingView>
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
  ownerPhone: { marginTop: 6, textAlign: "center", opacity: 0.85 },
  whatsappButton: { marginTop: 10 },
  card: { marginTop: 16, borderRadius: 16 },
  infoCard: {
    backgroundColor: "#f0fdf4",
  },
  warnCard: {
    backgroundColor: "#fffbeb",
  },
  cardBody: { marginTop: 8, lineHeight: 22 },
});
