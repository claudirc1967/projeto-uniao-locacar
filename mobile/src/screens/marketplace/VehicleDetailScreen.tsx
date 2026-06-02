import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import VehicleImageViewer from "../../components/VehicleImageViewer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import {
  formatVehicleCapacityLine,
} from "../../utils/vehicleDisplay";
import { vehicleTypeLabel } from "../../constants/vehicleType";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import {
  buildVehiclePickupSearchQuery,
  googleMapsSearchUrl,
  wazeSearchUrl,
  type VehiclePickupFields,
} from "../../utils/vehicleLocationLinks";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleDetail">;

const PHOTO_THUMB = 108;

function VehicleLocationActions({ vehicle }: { vehicle: VehiclePickupFields }) {
  const query = buildVehiclePickupSearchQuery(vehicle);
  if (!query) return null;

  const googleUrl = googleMapsSearchUrl(query);
  const wazeUrl = wazeSearchUrl(query);

  const onPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancelar", "Google Maps", "Waze"],
          cancelButtonIndex: 0,
          title: "Localização do veículo",
          message: query,
        },
        (i) => {
          if (i === 1) void Linking.openURL(googleUrl);
          else if (i === 2) void Linking.openURL(wazeUrl);
        }
      );
    } else {
      Alert.alert("Localização do veículo", query, [
        { text: "Cancelar", style: "cancel" },
        { text: "Google Maps", onPress: () => void Linking.openURL(googleUrl) },
        { text: "Waze", onPress: () => void Linking.openURL(wazeUrl) },
      ]);
    }
  };

  return (
    <Button mode="outlined" icon="map-marker-radius" onPress={onPress} style={styles.locationBtn}>
      Localização do veículo
    </Button>
  );
}

export function VehicleDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { vehicleId } = route.params;
  const { user } = useAuth();
  const q = trpc.marketplace.getVehiclePublic.useQuery({ vehicleId });
  const utils = trpc.useUtils();
  const request = trpc.driver.requestRental.useMutation({
    onSuccess: async () => {
      await utils.driver.myRentals.invalidate();
      navigation.navigate("DriverRentals");
    },
    onError: () => {
      /* shown below */
    },
  });

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const viewerImages = useMemo(
    () => (q.data?.photos ?? []).map((p) => ({ uri: p.photoUrl })),
    [q.data?.photos]
  );

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

  const v = q.data!;
  const ownerName = v.ownerName?.trim() || v.ownerEmail || "—";
  const descriptionText = v.description?.trim() || "";
  const brandModel = [v.brand?.trim(), v.model?.trim()].filter(Boolean).join(" ");
  const showDescription =
    !!descriptionText &&
    descriptionText.toLocaleLowerCase() !== brandModel.toLocaleLowerCase();
  const ownerHasReviews =
    (v.ownerRatingCount ?? 0) > 0 && v.ownerAverageRating != null;
  const driverStatus = user?.driverProfile?.status;
  const driverCanRequest = user?.role === "DRIVER" && driverStatus === "APPROVED";
  const driverApprovalMessage =
    user?.role === "DRIVER" && !driverCanRequest
      ? "Cadastro de motorista deve estar aprovado"
      : null;

  return (
    <>
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={{ backgroundColor: theme.colors.background }}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 20 + insets.bottom },
          ]}
        >
        <Text variant="headlineSmall">{v.title}</Text>
        <Text variant="bodyLarge" style={styles.meta}>
          {formatMoneyWithContractPeriod(v.dailyRateCents, v.contractTime)}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Fotos
        </Text>
        {v.photos.length === 0 ? (
          <Text variant="bodyMedium" style={styles.noPhotos}>
            Nenhuma foto cadastrada.
          </Text>
        ) : (
          <View style={styles.gallery}>
            {v.photos.map((p, index) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setViewerIndex(index);
                  setViewerVisible(true);
                }}
                style={({ pressed }) => [
                  styles.photoWrap,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Image
                  source={{ uri: p.photoUrl }}
                  style={styles.photo}
                />
              </Pressable>
            ))}
          </View>
        )}

        <Text variant="bodyMedium" style={styles.meta}>
          Placa: {v.plate}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          Marca: {v.brand ?? "—"}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          Modelo: {v.model ?? "—"}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          Ano: {v.year}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          Cor: {v.cor ?? "—"}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          Tipo: {vehicleTypeLabel(v.vehicleType)}
        </Text>
        {formatVehicleCapacityLine(v.vehicleType, v.portas, v.lugares) ? (
          <Text variant="bodyMedium" style={styles.meta}>
            {formatVehicleCapacityLine(v.vehicleType, v.portas, v.lugares)}
          </Text>
        ) : null}
        {showDescription ? (
          <Text variant="bodyMedium" style={styles.desc}>
            {descriptionText}
          </Text>
        ) : null}
        {v.requirementsJson ? (
          <Text variant="bodyMedium" style={styles.req}>
            Requisitos: {v.requirementsJson}
          </Text>
        ) : null}
        {v.paymentNotes ? (
          <Text variant="bodyMedium" style={styles.req}>
            Pagamento: {v.paymentNotes}
          </Text>
        ) : null}
        {v.caucao?.trim() ? (
          <Text variant="bodyMedium" style={styles.req}>
            Caução: {v.caucao.trim()}
          </Text>
        ) : null}
        {request.isError ? (
          <Text style={{ color: theme.colors.error, marginVertical: 8 }}>
            {trpcErrorMessage(request.error)}
          </Text>
        ) : null}
        {user?.role === "DRIVER" ? (
          <>
            <Text variant="titleSmall" style={styles.ownerLabel}>
              Locador: {ownerName}
            </Text>
            {ownerHasReviews ? (
              <>
                <Text variant="bodySmall" style={styles.ownerRating}>
                  ★ {v.ownerAverageRating.toFixed(1).replace(".", ",")} ({v.ownerRatingCount})
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={() =>
                    navigation.navigate("UserReviews", {
                      targetUserId: v.ownerUserId,
                      targetRole: "OWNER",
                      title: "Avaliações do locador",
                      displayName: ownerName,
                    })
                  }
                  style={styles.ownerReviewsBtn}
                >
                  Ver avaliações do locador
                </Button>
              </>
            ) : null}
            <VehicleLocationActions vehicle={v} />
          </>
        ) : null}
        {user?.role === "DRIVER" ? (
          v.driverRequestBlocked ? (
            <>
              <Text variant="bodySmall" style={styles.blockedHint}>
                Você não pode solicitar novamente este veículo após uma recusa. O
                proprietário pode permitir uma nova solicitação quando quiser.
              </Text>
              <Button mode="contained" disabled style={styles.requestBtn}>
                Solicitar locação
              </Button>
            </>
          ) : !driverCanRequest ? (
            <>
              <Text style={{ color: theme.colors.error, marginVertical: 8 }}>
                {driverApprovalMessage}
              </Text>
              <Button mode="contained" disabled style={styles.requestBtn}>
                Solicitar locação
              </Button>
            </>
          ) : (
            <Button
              mode="contained"
              style={styles.requestBtn}
              loading={request.isPending}
              disabled={request.isPending}
              onPress={() => request.mutate({ vehicleId })}
            >
              Solicitar locação
            </Button>
          )
        ) : (
          <Text variant="bodyMedium" style={styles.hint}>
            Entre como motorista para solicitar locação.
          </Text>
        )}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
            Voltar
          </Button>
        </View>
      </View>

      <VehicleImageViewer
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        onImageIndexChange={setViewerIndex}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 10,
  },
  meta: { marginTop: 6, opacity: 0.85 },
  ownerLabel: {
    marginTop: 16,
    marginBottom: 4,
    textAlign: "center",
    fontWeight: "700",
  },
  ownerRating: {
    textAlign: "center",
    opacity: 0.9,
  },
  ownerReviewsBtn: {
    alignSelf: "center",
    marginTop: 2,
  },
  locationBtn: { marginTop: 4 },
  requestBtn: { marginTop: 18 },
  desc: { marginTop: 12, fontSize: 16, lineHeight: 22 },
  req: { marginTop: 8, color: "#334155" },
  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  photoWrap: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  photo: {
    width: PHOTO_THUMB,
    height: PHOTO_THUMB,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  noPhotos: { color: "#94a3b8", marginBottom: 8, fontStyle: "italic" },
  hint: { marginTop: 16, opacity: 0.85 },
  blockedHint: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
  },
});
