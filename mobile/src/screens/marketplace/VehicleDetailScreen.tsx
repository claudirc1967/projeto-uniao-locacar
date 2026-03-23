import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleDetail">;

const PHOTO_THUMB = 108;

export function VehicleDetailScreen({ navigation, route }: Props) {
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

  const v = q.data!;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{v.title}</Text>
        <Text style={styles.meta}>
          {formatMoneyWithContractPeriod(v.dailyRateCents, v.contractTime)}
        </Text>

        <Text style={styles.sectionTitle}>Fotos</Text>
        {v.photos.length === 0 ? (
          <Text style={styles.noPhotos}>Nenhuma foto cadastrada.</Text>
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

        <Text style={styles.meta}>Placa: {v.plate}</Text>
        <Text style={styles.meta}>Modelo: {v.model ?? "—"}</Text>
        <Text style={styles.meta}>Ano: {v.year ?? "—"}</Text>
        <Text style={styles.meta}>Cor: {v.cor ?? "—"}</Text>
        {v.description ? (
          <Text style={styles.desc}>{v.description}</Text>
        ) : null}
        {v.requirementsJson ? (
          <Text style={styles.req}>Requisitos: {v.requirementsJson}</Text>
        ) : null}
        {v.paymentNotes ? (
          <Text style={styles.req}>Pagamento: {v.paymentNotes}</Text>
        ) : null}
        {v.caucao?.trim() ? (
          <Text style={styles.req}>Caução: {v.caucao.trim()}</Text>
        ) : null}
        {request.isError ? (
          <Text style={styles.err}>{trpcErrorMessage(request.error)}</Text>
        ) : null}
        {user?.role === "DRIVER" ? (
          v.driverRequestBlocked ? (
            <>
              <Text style={styles.blockedHint}>
                Você não pode solicitar novamente este veículo após uma recusa. O
                proprietário pode permitir uma nova solicitação quando quiser.
              </Text>
              <AppButton title="Solicitar aluguel" disabled />
            </>
          ) : (
            <AppButton
              title="Solicitar aluguel"
              loading={request.isPending}
              onPress={() => request.mutate({ vehicleId })}
            />
          )
        ) : (
          <Text style={styles.hint}>
            Entre como motorista para solicitar aluguel.
          </Text>
        )}
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
  title: { fontSize: 24, fontWeight: "700" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 16,
    marginBottom: 10,
  },
  meta: { color: "#64748b", marginTop: 6 },
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
  err: { color: "#dc2626", marginVertical: 8 },
  hint: { marginTop: 16, color: "#64748b" },
  blockedHint: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
  },
});
