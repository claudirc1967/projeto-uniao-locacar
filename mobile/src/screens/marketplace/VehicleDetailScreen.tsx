import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleDetail">;

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{v.title}</Text>
      <Text style={styles.meta}>
        {formatMoneyWithContractPeriod(v.dailyRateCents, v.contractTime)}
      </Text>
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
      <View style={styles.gallery}>
        {v.photos.map((p) => (
          <Image key={p.id} source={{ uri: p.photoUrl }} style={styles.photo} />
        ))}
      </View>
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
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700" },
  meta: { color: "#64748b", marginTop: 6 },
  desc: { marginTop: 12, fontSize: 16, lineHeight: 22 },
  req: { marginTop: 8, color: "#334155" },
  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  photo: { width: 100, height: 100, borderRadius: 8, backgroundColor: "#f1f5f9" },
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
