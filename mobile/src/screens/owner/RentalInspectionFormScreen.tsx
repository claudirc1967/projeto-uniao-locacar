import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import type { RootStackParamList } from "../../navigation/types";
import { imageUriToUint8Array } from "../../utils/imageUriToBlob";
import { prepareImageForUpload } from "../../utils/prepareImageForUpload";
import {
  isAllowedImageType,
  validatePhotosForUpload,
} from "../../utils/photoUploadRules";
import { trpcErrorMessage } from "../../utils/trpcError";
import { putWithRetry } from "../../utils/uploadWithRetry";
import { putViaApiProxy } from "../../utils/uploadViaApiProxy";

type Props = NativeStackScreenProps<RootStackParamList, "RentalInspectionForm">;
type FuelLevel = "EMPTY" | "QUARTER" | "HALF" | "THREE_QUARTERS" | "FULL";
type AllowedImageType = "image/jpeg" | "image/png" | "image/webp";

type Picked = {
  uri: string;
  mime: string;
  size: number;
  name?: string;
};

type ViewerSlot =
  | { kind: "saved"; id: string; uri: string }
  | { kind: "pending"; uri: string };

const MAX_INSPECTION_PHOTOS = 10;
const PHOTO_GAP = 8;
const PHOTO_COLS = 3;
const PHOTO_PAD = 20;
const PHOTO_SIZE =
  (Dimensions.get("window").width - PHOTO_PAD * 2 - PHOTO_GAP * (PHOTO_COLS - 1)) /
  PHOTO_COLS;

const titleByType = {
  CHECKOUT: "Vistoria de retirada",
  CHECKIN: "Vistoria de devolução",
} as const;

const fuelOptions: Array<{ value: FuelLevel; label: string }> = [
  { value: "EMPTY", label: "Vazio" },
  { value: "QUARTER", label: "1/4" },
  { value: "HALF", label: "1/2" },
  { value: "THREE_QUARTERS", label: "3/4" },
  { value: "FULL", label: "Cheio" },
];

export function RentalInspectionFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { rentalId, type } = route.params;
  const isWeb = Platform.OS === "web";
  const utils = trpc.useUtils();
  const q = trpc.rentalInspection.list.useQuery({ rentalId });
  const presign = trpc.rentalInspection.requestPhotoUploads.useMutation();
  const save = trpc.rentalInspection.upsert.useMutation();
  const deletePhoto = trpc.rentalInspection.deletePhoto.useMutation();

  const [odometerKm, setOdometerKm] = useState("");
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>("FULL");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<Picked[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const existing = q.data?.items.find((i) => i.type === type);
  const existingPhotos = existing?.photos ?? [];
  const maxSelectable = Math.max(
    0,
    MAX_INSPECTION_PHOTOS - existingPhotos.length - pending.length
  );

  useEffect(() => {
    if (!existing) return;
    setOdometerKm(String(existing.odometerKm));
    setFuelLevel(existing.fuelLevel as FuelLevel);
    setNotes(existing.notes ?? "");
  }, [existing]);

  const viewerSlots: ViewerSlot[] = useMemo(() => {
    const saved: ViewerSlot[] = existingPhotos.map((photo) => ({
      kind: "saved" as const,
      id: photo.id,
      uri: photo.photoUrl,
    }));
    const pend: ViewerSlot[] = pending.map((photo) => ({
      kind: "pending" as const,
      uri: photo.uri,
    }));
    return [...saved, ...pend];
  }, [existingPhotos, pending]);

  const viewerImages = useMemo(
    () => viewerSlots.map((slot) => ({ uri: slot.uri })),
    [viewerSlots]
  );

  const removePending = (uri: string) => {
    setPending((prev) => prev.filter((photo) => photo.uri !== uri));
  };

  const runDeleteSaved = async (photoId: string) => {
    setErr(null);
    setBusy(true);
    try {
      await deletePhoto.mutateAsync({ rentalId, photoId });
      await utils.rentalInspection.list.invalidate({ rentalId });
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      setViewerVisible(false);
    } catch (e) {
      setErr(trpcErrorMessage(e, "Não foi possível excluir a foto."));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemoveSlot = (index: number) => {
    const slot = viewerSlots[index];
    if (!slot) return;
    if (slot.kind === "pending") {
      Alert.alert("Remover foto", "Descartar esta imagem da fila de envio?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            removePending(slot.uri);
            setViewerVisible(false);
          },
        },
      ]);
      return;
    }

    Alert.alert("Excluir foto", "A foto será removida da vistoria e do armazenamento.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => void runDeleteSaved(slot.id),
      },
    ]);
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const pickImages = async () => {
    setErr(null);
    if (maxSelectable <= 0) {
      Alert.alert("Limite", "Esta vistoria já tem o máximo de fotos.");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Permissão da galeria negada.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: maxSelectable,
      quality: 0.85,
    });
    if (res.canceled) return;

    const raw = res.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.fileName ?? undefined,
    }));
    if (raw.length === 0) return;

    setBusy(true);
    setStatus("Preparando fotos…");
    try {
      const next: Picked[] = [];
      for (let i = 0; i < raw.length; i++) {
        setStatus(`Preparando foto ${i + 1} de ${raw.length}…`);
        const prepared = await prepareImageForUpload(raw[i]!.uri);
        next.push({
          uri: prepared.uri,
          mime: prepared.mime,
          size: prepared.size,
          name: raw[i]!.name,
        });
      }

      const check = validatePhotosForUpload(
        next.map((p) => ({ uri: p.uri, mime: p.mime, size: p.size }))
      );
      if (!check.ok) {
        setErr(check.message);
        return;
      }
      for (const photo of next) {
        if (!isAllowedImageType(photo.mime)) {
          setErr("Tipo de imagem não permitido.");
          return;
        }
      }
      setPending((prev) => [...prev, ...next]);
      setStatus(`${next.length} foto(s) pronta(s).`);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Não foi possível preparar as fotos."
      );
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const runSave = async () => {
    setErr(null);
    const km = Number(odometerKm.replace(/\D/g, ""));
    if (!Number.isInteger(km) || km < 0) {
      setErr("Informe o hodômetro em km.");
      return;
    }
    if (existingPhotos.length + pending.length < 1) {
      setErr("Adicione pelo menos 1 foto da vistoria.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      let uploaded: Array<{
        key: string;
        contentType: AllowedImageType;
        byteSize: number;
      }> = [];

      if (pending.length > 0) {
        setStatus("Solicitando URLs de upload...");
        const pres = await presign.mutateAsync({
          rentalId,
          type,
          files: pending.map((photo) => ({
            contentType: photo.mime as AllowedImageType,
            fileName: photo.name,
            byteSize: photo.size,
          })),
        });

        for (let i = 0; i < pres.items.length; i++) {
          const row = pres.items[i]!;
          const photo = pending[i]!;
          setStatus(`Enviando foto ${i + 1} de ${pending.length}...`);
          const bytes = await imageUriToUint8Array(photo.uri);
          const ct = row.contentType ?? photo.mime;
          if (isWeb) {
            await putViaApiProxy(
              "/upload/rental-inspection-photo",
              { rentalId, type, key: row.key },
              bytes,
              ct
            );
          } else {
            await putWithRetry(
              row.uploadUrl,
              bytes,
              row.requiredHeaders ?? { "Content-Type": ct },
              2
            );
          }
        }

        uploaded = pres.items.map((row, index) => ({
          key: row.key,
          contentType: row.contentType as AllowedImageType,
          byteSize: pending[index]!.size,
        }));
      }

      setStatus("Salvando vistoria...");
      await save.mutateAsync({
        rentalId,
        type,
        odometerKm: km,
        fuelLevel,
        notes: notes.trim() || null,
        photos: [
          ...existingPhotos.map((photo) => ({
            key: photo.key,
            contentType: photo.contentType as AllowedImageType,
            byteSize: photo.byteSize,
          })),
          ...uploaded,
        ],
      });

      await utils.rentalInspection.list.invalidate({ rentalId });
      await utils.owner.getIncomingRentalDetail.invalidate({ rentalId });
      setPending([]);
      Alert.alert("Pronto", "Vistoria salva com sucesso.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setErr(trpcErrorMessage(e, "Falha ao salvar vistoria."));
      setStatus(null);
    } finally {
      setBusy(false);
    }
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

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + 140 },
        ]}
      >
        <Text variant="headlineSmall">{titleByType[type]}</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Registre hodômetro, combustível, fotos e observações. Após edição, os OKs
          pendentes são reiniciados.
        </Text>

        <Text variant="labelLarge" style={styles.label}>
          Hodômetro (km)
        </Text>
        <TextInput
          mode="outlined"
          value={odometerKm}
          onChangeText={(value) => setOdometerKm(value.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="Ex.: 52340"
          style={styles.field}
        />

        <Text variant="labelLarge" style={styles.label}>
          Combustível
        </Text>
        <View style={styles.fuelGrid}>
          {fuelOptions.map((option) => (
            <Button
              key={option.value}
              mode={fuelLevel === option.value ? "contained" : "outlined"}
              compact
              onPress={() => setFuelLevel(option.value)}
              style={styles.fuelButton}
              contentStyle={styles.fuelButtonContent}
              labelStyle={styles.fuelButtonLabel}
            >
              {option.label}
            </Button>
          ))}
        </View>

        <Text variant="labelLarge" style={styles.label}>
          Fotos ({existingPhotos.length + pending.length}/{MAX_INSPECTION_PHOTOS})
        </Text>
        <View style={styles.photoGrid}>
          {existingPhotos.map((photo, index) => (
            <View key={photo.id} style={styles.photoWrap}>
              <Pressable onPress={() => openViewer(index)}>
                <Image source={{ uri: photo.photoUrl }} style={styles.photo} />
              </Pressable>
              <Pressable
                style={styles.thumbRemove}
                hitSlop={8}
                onPress={() => confirmRemoveSlot(index)}
                disabled={busy}
              >
                <Text style={styles.thumbRemoveText} accessibilityLabel="Excluir foto">
                  ×
                </Text>
              </Pressable>
            </View>
          ))}
          {pending.map((photo, pendingIndex) => {
            const index = existingPhotos.length + pendingIndex;
            return (
              <View key={photo.uri} style={styles.photoWrap}>
                <Pressable onPress={() => openViewer(index)}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                </Pressable>
                <View style={styles.pendingBadge}>
                  <Text variant="labelSmall" style={styles.pendingBadgeText}>
                    Nova
                  </Text>
                </View>
                <Pressable
                  style={styles.thumbRemove}
                  hitSlop={8}
                  onPress={() => confirmRemoveSlot(index)}
                  disabled={busy}
                >
                  <Text style={styles.thumbRemoveText} accessibilityLabel="Remover foto">
                    ×
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <Button
          mode="outlined"
          onPress={pickImages}
          disabled={busy || maxSelectable <= 0}
          style={styles.addPhotoButton}
        >
          Selecionar fotos
        </Button>

        <Text variant="labelLarge" style={styles.label}>
          Observações
        </Text>
        <TextInput
          mode="outlined"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Ex.: riscos, amassados, itens internos..."
          contentStyle={styles.notesContent}
          style={styles.field}
        />

        {status ? (
          <Text variant="bodySmall" style={styles.status}>
            {status}
          </Text>
        ) : null}
        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>

        <Button mode="contained" loading={busy} disabled={busy} onPress={runSave}>
          Salvar vistoria
        </Button>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
      </KeyboardAvoidingView>
      <ImageViewerModal
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        onImageIndexChange={setViewerIndex}
        renderFooter={({ imageIndex }: { imageIndex: number }) => (
          <View
            style={[
              styles.viewerFooter,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Button
              mode="text"
              textColor="#fecaca"
              onPress={() => confirmRemoveSlot(imageIndex)}
              disabled={busy}
            >
              Excluir foto
            </Button>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  hint: { marginTop: 8, lineHeight: 20, opacity: 0.85 },
  label: { marginTop: 16, marginBottom: 6, opacity: 0.9 },
  field: { backgroundColor: "#fff" },
  fuelGrid: { flexDirection: "row", gap: 4 },
  fuelButton: { flex: 1, minWidth: 0 },
  fuelButtonContent: { paddingHorizontal: 0 },
  fuelButtonLabel: { marginHorizontal: 0, fontSize: 12 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: {
    width: PHOTO_SIZE,
    marginBottom: PHOTO_GAP,
    position: "relative",
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  pendingBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: "rgba(15, 118, 110, 0.92)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: { color: "#fff" },
  thumbRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  thumbRemoveText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: -1,
  },
  addPhotoButton: { marginTop: 10 },
  notesContent: { minHeight: 96 },
  status: { marginTop: 8, color: "#0f766e" },
  viewerFooter: {
    alignItems: "center",
    width: "100%",
  },
});
