import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Button, Text, useTheme } from "react-native-paper";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleDetail">;

const PHOTO_THUMB = 108;

export function VehicleDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { vehicleId } = route.params;
  const { user } = useAuth();
  const q = trpc.marketplace.getVehiclePublic.useQuery({ vehicleId });
  const utils = trpc.useUtils();
  const request = trpc.driver.requestRental.useMutation({
    onSuccess: async () => {
      await utils.driver.myRentals.invalidate();
      navigation.navigate("DriverRentals");
    },
    onError: (e) => {
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

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
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
          Modelo: {v.model ?? "—"}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          Ano: {v.year ?? "—"}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          Cor: {v.cor ?? "—"}
        </Text>
        {v.description ? (
          <Text variant="bodyMedium" style={styles.desc}>
            {v.description}
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
          v.driverRequestBlocked ? (
            <>
              <Text variant="bodySmall" style={styles.blockedHint}>
                Você não pode solicitar novamente este veículo após uma recusa. O
                proprietário pode permitir uma nova solicitação quando quiser.
              </Text>
              <Button mode="contained" disabled>
                Solicitar aluguel
              </Button>
            </>
          ) : (
            <Button
              mode="contained"
              loading={request.isPending}
              disabled={request.isPending}
              onPress={() => request.mutate({ vehicleId })}
            >
              Solicitar aluguel
            </Button>
          )
        ) : (
          <Text variant="bodyMedium" style={styles.hint}>
            Entre como motorista para solicitar aluguel.
          </Text>
        )}
        <Button mode="text" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </ScrollView>

      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        onImageIndexChange={setViewerIndex}
        doubleTapToZoomEnabled
        swipeToCloseEnabled
        presentationStyle="overFullScreen"
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 10,
  },
  meta: { marginTop: 6, opacity: 0.85 },
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
