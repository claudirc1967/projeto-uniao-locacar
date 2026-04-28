import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { ImageViewerModal } from "./ImageViewerModal";
import { trpc } from "../api/trpc";
import { formatDateTimeDisplay } from "../utils/masks";
import { trpcErrorMessage } from "../utils/trpcError";

type InspectionType = "CHECKOUT" | "CHECKIN";
type UserRole = "OWNER" | "DRIVER";
type RentalStatus =
  | "PENDING_OWNER"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

type Inspection = {
  type: InspectionType;
  odometerKm: number;
  fuelLevel: FuelLevel;
  notes: string | null;
  ownerAckAt: Date | string | null;
  driverAckAt: Date | string | null;
  createdAt: Date | string;
  photos: Array<{ id: string; photoUrl: string }>;
};

type FuelLevel = "EMPTY" | "QUARTER" | "HALF" | "THREE_QUARTERS" | "FULL";

const fuelLabel: Record<FuelLevel, string> = {
  EMPTY: "Vazio",
  QUARTER: "1/4",
  HALF: "1/2",
  THREE_QUARTERS: "3/4",
  FULL: "Cheio",
};

const inspectionTitle: Record<InspectionType, string> = {
  CHECKOUT: "Vistoria de retirada",
  CHECKIN: "Vistoria de devolução",
};

function canOwnerEdit(type: InspectionType, status: RentalStatus) {
  if (type === "CHECKOUT") return status === "APPROVED" || status === "ACTIVE";
  return status === "ACTIVE";
}

function ackStatus(i: Inspection | undefined) {
  if (!i) return "Não feita";
  if (i.ownerAckAt && i.driverAckAt) return "OK por ambos";
  if (!i.ownerAckAt && !i.driverAckAt) return "Aguardando OK de ambos";
  if (!i.ownerAckAt) return "Aguardando OK do locador";
  return "Aguardando OK do motorista";
}

export function RentalInspectionSection({
  rentalId,
  rentalStatus,
  role,
  onEditInspection,
}: {
  rentalId: string;
  rentalStatus: RentalStatus;
  role: UserRole;
  onEditInspection?: (type: InspectionType) => void;
}) {
  const theme = useTheme();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState<Array<{ uri: string }>>([]);
  const utils = trpc.useUtils();
  const q = trpc.rentalInspection.list.useQuery({ rentalId });
  const ack = trpc.rentalInspection.ack.useMutation({
    onSuccess: async () => {
      await utils.rentalInspection.list.invalidate({ rentalId });
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      await utils.driver.getRentalDetail.invalidate({ rentalId });
    },
    onError: (e) => Alert.alert("Falha", trpcErrorMessage(e)),
  });

  const inspections = (q.data?.items ?? []) as Inspection[];
  const byType = (type: InspectionType) =>
    inspections.find((inspection) => inspection.type === type);

  const openViewer = (photos: Inspection["photos"], index: number) => {
    setViewerImages(photos.map((photo) => ({ uri: photo.photoUrl })));
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const renderInspection = (type: InspectionType) => {
    const inspection = byType(type);
    const canEdit =
      role === "OWNER" &&
      canOwnerEdit(type, rentalStatus) &&
      !(inspection?.ownerAckAt && inspection.driverAckAt);
    const userAlreadyAcked =
      role === "OWNER" ? !!inspection?.ownerAckAt : !!inspection?.driverAckAt;

    return (
      <View style={styles.inspectionBlock} key={type}>
        <View style={styles.inspectionContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text variant="titleSmall">{inspectionTitle[type]}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                {ackStatus(inspection)}
              </Text>
            </View>
            {canEdit ? (
              <Button mode={inspection ? "outlined" : "contained-tonal"} compact onPress={() => onEditInspection?.(type)}>
                {inspection ? "Editar" : "Fazer"}
              </Button>
            ) : null}
          </View>

          {inspection ? (
            <>
              <Text variant="bodySmall" style={styles.meta}>
                Criada em {formatDateTimeDisplay(inspection.createdAt)}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Hodômetro: {inspection.odometerKm.toLocaleString("pt-BR")} km ·
                Combustível: {fuelLabel[inspection.fuelLevel]}
              </Text>
              {inspection.notes ? (
                <Text variant="bodySmall" style={styles.notes}>
                  Observações: {inspection.notes}
                </Text>
              ) : null}
              <View style={styles.photoRow}>
                {inspection.photos.slice(0, 6).map((photo, index) => (
                  <Pressable
                    key={photo.id}
                    style={styles.photoWrap}
                    onPress={() => openViewer(inspection.photos, index)}
                  >
                    <Image source={{ uri: photo.photoUrl }} style={styles.photo} />
                  </Pressable>
                ))}
              </View>
              <Text variant="bodySmall" style={styles.meta}>
                OK locador: {inspection.ownerAckAt ? formatDateTimeDisplay(inspection.ownerAckAt) : "pendente"}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                OK motorista: {inspection.driverAckAt ? formatDateTimeDisplay(inspection.driverAckAt) : "pendente"}
              </Text>
              {!userAlreadyAcked ? (
                <Button
                  mode="contained"
                  compact
                  style={styles.ackButton}
                  loading={ack.isPending}
                  onPress={() => ack.mutate({ rentalId, type })}
                >
                  Dar OK
                </Button>
              ) : null}
            </>
          ) : (
            <Text variant="bodySmall" style={styles.emptyText}>
              Recomendada para registrar fotos, combustível e hodômetro.
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="titleMedium">Vistorias</Text>
          {q.isLoading ? (
            <Text variant="bodySmall" style={styles.meta}>
              Carregando vistorias...
            </Text>
          ) : q.isError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {trpcErrorMessage(q.error)}
            </Text>
          ) : (
            <>
              {q.data?.mileage ? (
                <View style={styles.mileageBox}>
                  <Text variant="bodySmall" style={styles.mileageText}>
                    Km rodado: {q.data.mileage.drivenKm.toLocaleString("pt-BR")} km
                  </Text>
                  {!q.data.mileage.kmLivre && q.data.mileage.kmPorContrato > 0 ? (
                    <Text variant="bodySmall" style={styles.mileageText}>
                      Limite: {q.data.mileage.kmPorContrato.toLocaleString("pt-BR")} km · Excedente:{" "}
                      {q.data.mileage.exceededKm.toLocaleString("pt-BR")} km
                    </Text>
                  ) : (
                    <Text variant="bodySmall" style={styles.mileageText}>
                      Contrato com km livre.
                    </Text>
                  )}
                </View>
              ) : null}
              {renderInspection("CHECKOUT")}
              <View style={styles.innerDivider} />
              {renderInspection("CHECKIN")}
            </>
          )}
        </Card.Content>
      </Card>
      <ImageViewerModal
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
  card: { marginBottom: 0, borderRadius: 18, backgroundColor: "#fff" },
  content: { gap: 10 },
  inspectionBlock: { paddingVertical: 2 },
  inspectionContent: { gap: 6 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  headerText: { flex: 1 },
  meta: { opacity: 0.85 },
  notes: { marginTop: 2, lineHeight: 19 },
  emptyText: { opacity: 0.75, lineHeight: 19 },
  innerDivider: { height: 1, backgroundColor: "#e2e8f0" },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  photoWrap: {
    width: 58,
    height: 58,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  photo: { width: "100%", height: "100%" },
  ackButton: { marginTop: 4, alignSelf: "flex-start" },
  mileageBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    gap: 2,
  },
  mileageText: { color: "#166534" },
});
