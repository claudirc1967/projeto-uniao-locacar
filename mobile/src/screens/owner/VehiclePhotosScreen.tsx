import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  HelperText,
  Text,
  useTheme,
} from "react-native-paper";
import VehicleImageViewer from "../../components/VehicleImageViewer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  isAllowedImageType,
  validatePhotosForUpload,
} from "../../utils/photoUploadRules";
import { imageUriToUint8Array } from "../../utils/imageUriToBlob";
import { prepareImageForUpload } from "../../utils/prepareImageForUpload";
import { putWithRetry } from "../../utils/uploadWithRetry";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VehiclePhotos">;

type Picked = {
  uri: string;
  mime: string;
  size: number;
  name?: string;
};

type ViewerSlot =
  | { kind: "saved"; id: string; uri: string }
  | { kind: "pending"; uri: string };

const COL_GAP = 8;
const COLS = 3;
const PAD = 20;
const THUMB_W =
  (Dimensions.get("window").width - PAD * 2 - COL_GAP * (COLS - 1)) / COLS;

export function VehiclePhotosScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { vehicleId } = route.params;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [pending, setPending] = useState<Picked[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const utils = trpc.useUtils();
  const vehicleQuery = trpc.owner.getMyVehicle.useQuery({ vehicleId });
  const presign = trpc.owner.requestVehiclePhotoUploads.useMutation();
  const confirm = trpc.owner.addVehiclePhotos.useMutation();
  const deletePhoto = trpc.owner.deleteVehiclePhoto.useMutation();

  const savedPhotos = vehicleQuery.data?.photos ?? [];

  const viewerSlots: ViewerSlot[] = useMemo(() => {
    const saved: ViewerSlot[] = savedPhotos.map((p) => ({
      kind: "saved" as const,
      id: p.id,
      uri: p.photoUrl,
    }));
    const pend: ViewerSlot[] = pending.map((p) => ({
      kind: "pending" as const,
      uri: p.uri,
    }));
    return [...saved, ...pend];
  }, [savedPhotos, pending]);

  const viewerImages = useMemo(
    () => viewerSlots.map((s) => ({ uri: s.uri })),
    [viewerSlots]
  );

  const maxSelectable = Math.max(0, 6 - savedPhotos.length);

  const pickImages = async () => {
    setErr(null);
    if (maxSelectable <= 0) {
      Alert.alert("Limite", "Já existem 6 fotos para este veículo.");
      return;
    }

    type RawPick = { uri: string; name?: string };
    const raw: RawPick[] = [];

    if (Platform.OS === "web") {
      const res = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: false,
        multiple: true,
      });
      if (res.canceled) return;
      for (const a of (res.assets ?? []).slice(0, maxSelectable)) {
        raw.push({ uri: a.uri, name: a.name ?? undefined });
      }
    } else {
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
      for (const a of res.assets) {
        raw.push({ uri: a.uri, name: a.fileName ?? undefined });
      }
    }

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
        next.map((n) => ({ uri: n.uri, mime: n.mime, size: n.size }))
      );
      if (!check.ok) {
        setErr(check.message);
        return;
      }
      for (const n of next) {
        if (!isAllowedImageType(n.mime)) {
          setErr("Tipo de imagem não permitido.");
          return;
        }
      }
      setPending(next);
      setStatus(`${next.length} foto(s) pronta(s) para enviar.`);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Não foi possível preparar as fotos."
      );
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const removePending = (uri: string) => {
    setPending((prev) => prev.filter((p) => p.uri !== uri));
  };

  const confirmRemoveSlot = (index: number) => {
    const slot = viewerSlots[index];
    if (!slot) return;
    if (slot.kind === "pending") {
      if (isWeb) {
        const ok = globalThis.confirm?.(
          "Descartar esta imagem da fila de envio?"
        );
        if (ok) {
          removePending(slot.uri);
          setViewerVisible(false);
        }
        return;
      }
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
    if (isWeb) {
      const ok = globalThis.confirm?.(
        "A foto será removida do veículo e do armazenamento. Excluir?"
      );
      if (ok) void runDeleteSaved(slot.id);
      return;
    }
    Alert.alert(
      "Excluir foto",
      "A foto será removida do veículo e do armazenamento.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => void runDeleteSaved(slot.id),
        },
      ]
    );
  };

  const runDeleteSaved = async (photoId: string) => {
    setErr(null);
    try {
      await deletePhoto.mutateAsync({ vehicleId, photoId });
      await utils.owner.getMyVehicle.invalidate({ vehicleId });
      await utils.owner.listMyVehicles.invalidate();
      setViewerVisible(false);
    } catch (e) {
      setErr(trpcErrorMessage(e, "Não foi possível excluir a foto."));
    }
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const runUpload = async () => {
    setErr(null);
    const check = validatePhotosForUpload(
      pending.map((n) => ({ uri: n.uri, mime: n.mime, size: n.size }))
    );
    if (!check.ok) {
      setErr(check.message);
      return;
    }

    setBusy(true);
    setStatus("Solicitando URLs de upload…");
    try {
      const pres = await presign.mutateAsync({
        vehicleId,
        files: pending.map((p) => ({
          contentType: p.mime as "image/jpeg" | "image/png" | "image/webp",
          fileName: p.name,
          byteSize: p.size,
        })),
      });

      const items = pres.items;
      if (items.length !== pending.length) {
        throw new Error("Resposta inválida do servidor.");
      }

      for (let i = 0; i < items.length; i++) {
        setStatus(`Enviando foto ${i + 1} de ${items.length}…`);
        const row = items[i]!;
        const p = pending[i]!;
        const bytes = await imageUriToUint8Array(p.uri);
        const ct = row.contentType ?? p.mime;
        const extraHeaders =
          row.requiredHeaders ?? ({ "Content-Type": ct } as Record<string, string>);
        await putWithRetry(row.uploadUrl, bytes, extraHeaders, 2);
      }

      setStatus("Confirmando no servidor…");
      await confirm.mutateAsync({
        vehicleId,
        photos: items.map((row, i) => ({
          key: row.key,
          contentType: row.contentType as "image/jpeg" | "image/png" | "image/webp",
          byteSize: pending[i]!.size,
        })),
      });

      await utils.owner.listMyVehicles.invalidate();
      await utils.owner.getMyVehicle.invalidate({ vehicleId });
      setPending([]);
      setStatus(null);
      Alert.alert("Pronto", "Fotos salvas com sucesso.");
    } catch (e) {
      setErr(trpcErrorMessage(e, "Falha no fluxo de upload."));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const Footer = ({ imageIndex }: { imageIndex: number }) => {
    const slot = viewerSlots[imageIndex];
    if (!slot) return null;
    return (
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
          disabled={deletePhoto.isPending}
        >
          {slot.kind === "pending" ? "Remover da fila" : "Excluir foto"}
        </Button>
      </View>
    );
  };

  if (vehicleQuery.isLoading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Carregando fotos…
        </Text>
      </View>
    );
  }

  if (vehicleQuery.error) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Text style={{ color: theme.colors.error }}>
          {trpcErrorMessage(vehicleQuery.error)}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={{ backgroundColor: theme.colors.background }}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 8 + insets.bottom },
          ]}
        >
        <Text variant="headlineSmall">Fotos do veículo</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Até 6 fotos no total. Toque na imagem para ampliar (use o gesto de pinça
          ou toque duplo para zoom). Máx. 5 MB cada. JPEG, PNG ou WebP.
        </Text>

        <Text variant="titleMedium" style={styles.sectionLabel}>
          Galeria ({viewerSlots.length}/6)
        </Text>
        <View style={styles.grid}>
          {viewerSlots.map((slot, index) => (
            <View key={slot.kind === "saved" ? slot.id : slot.uri} style={styles.thumbWrap}>
              <Pressable
                onPress={() => openViewer(index)}
                style={({ pressed }) => [styles.thumbPress, pressed && { opacity: 0.85 }]}
              >
                <Image source={{ uri: slot.uri }} style={styles.thumb} />
                {slot.kind === "pending" ? (
                  <View style={styles.pendingBadge}>
                    <Text variant="labelSmall" style={styles.pendingBadgeText}>
                      Nova
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                style={styles.thumbRemove}
                hitSlop={8}
                onPress={() => confirmRemoveSlot(index)}
              >
                <Text style={styles.thumbRemoveText} accessibilityLabel="Remover">
                  ×
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {viewerSlots.length === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhuma foto ainda.
          </Text>
        ) : null}

        <Text variant="titleMedium" style={[styles.sectionLabel, { marginTop: 20 }]}>
          Adicionar fotos
        </Text>
        <Button
          mode="outlined"
          onPress={pickImages}
          disabled={busy || maxSelectable === 0}
        >
          Selecionar imagens
        </Button>
        <Button
          mode="contained"
          loading={busy}
          disabled={pending.length === 0 || busy}
          onPress={runUpload}
          style={{ marginTop: 8 }}
        >
          {busy ? "Enviando…" : "Enviar novas fotos"}
        </Button>
        {status ? (
          <Text variant="bodyMedium" style={styles.status}>
            {status}
          </Text>
        ) : null}
        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
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
        renderFooter={({ imageIndex }) => <Footer imageIndex={imageIndex} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: PAD, paddingBottom: 12 },
  footer: { paddingHorizontal: PAD, paddingTop: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 12, opacity: 0.75 },
  hint: { marginVertical: 12, lineHeight: 20, opacity: 0.85 },
  sectionLabel: { marginBottom: 10 },
  empty: { fontStyle: "italic", marginBottom: 8, opacity: 0.7 },
  status: { marginTop: 12, color: "#0f766e" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: COL_GAP,
  },
  thumbWrap: {
    width: THUMB_W,
    marginBottom: COL_GAP,
  },
  thumbPress: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_W,
    borderRadius: 8,
  },
  pendingBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(15, 118, 110, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
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
  viewerFooter: {
    alignItems: "center",
    width: "100%",
  },
});
