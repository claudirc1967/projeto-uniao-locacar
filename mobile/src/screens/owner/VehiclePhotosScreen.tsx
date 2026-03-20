import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import {
  isAllowedImageType,
  validatePhotosForUpload,
} from "../../utils/photoUploadRules";
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

async function blobSizeFromUri(uri: string): Promise<number> {
  const r = await fetch(uri);
  const b = await r.blob();
  return b.size;
}

export function VehiclePhotosScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const [picked, setPicked] = useState<Picked[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const utils = trpc.useUtils();
  const presign = trpc.owner.requestVehiclePhotoUploads.useMutation();
  const confirm = trpc.owner.addVehiclePhotos.useMutation();

  const pickImages = async () => {
    setErr(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Permissão da galeria negada.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      // `expo-image-picker` aceita `MediaType` como string literal: 'images'
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.85,
    });
    if (res.canceled) return;

    const next: Picked[] = [];
    for (const a of res.assets) {
      const mime = a.mimeType ?? "image/jpeg";
      let size = a.fileSize ?? 0;
      if (!size) {
        try {
          size = await blobSizeFromUri(a.uri);
        } catch {
          size = 0;
        }
      }
      next.push({
        uri: a.uri,
        mime,
        size,
        name: a.fileName ?? undefined,
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
    setPicked(next);
    setStatus(`${next.length} foto(s) selecionada(s).`);
  };

  const runUpload = async () => {
    setErr(null);
    const check = validatePhotosForUpload(
      picked.map((n) => ({ uri: n.uri, mime: n.mime, size: n.size }))
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
        files: picked.map((p) => ({
          contentType: p.mime as "image/jpeg" | "image/png" | "image/webp",
          fileName: p.name,
          byteSize: p.size,
        })),
      });

      const items = pres.items;
      if (items.length !== picked.length) {
        throw new Error("Resposta inválida do servidor.");
      }

      for (let i = 0; i < items.length; i++) {
        setStatus(`Enviando foto ${i + 1} de ${items.length}…`);
        const row = items[i]!;
        const p = picked[i]!;
        const blob = await (await fetch(p.uri)).blob();
        const ct = row.contentType ?? p.mime;
        const extraHeaders =
          row.requiredHeaders ?? ({ "Content-Type": ct } as Record<string, string>);
        await putWithRetry(row.uploadUrl, blob, extraHeaders, 2);
      }

      setStatus("Confirmando no servidor…");
      await confirm.mutateAsync({
        vehicleId,
        photos: items.map((row, i) => ({
          key: row.key,
          contentType: row.contentType as "image/jpeg" | "image/png" | "image/webp",
          byteSize: picked[i]!.size,
          sortOrder: i,
        })),
      });

      await utils.owner.listMyVehicles.invalidate();
      await utils.owner.getMyVehicle.invalidate({ vehicleId });
      Alert.alert("Pronto", "Fotos salvas com sucesso.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setErr(trpcErrorMessage(e, "Falha no fluxo de upload."));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Fotos do veículo</Text>
      <Text style={styles.hint}>
        Entre 1 e 6 imagens. Máx. 5 MB cada. JPEG, PNG ou WebP. Upload direto
        para o storage (PUT assinado), sem multipart no backend.
      </Text>
      <AppButton title="Selecionar imagens" onPress={pickImages} disabled={busy} />
      <AppButton
        title={busy ? "Enviando…" : "Enviar e confirmar"}
        loading={busy}
        onPress={runUpload}
        disabled={picked.length === 0 || busy}
      />
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <View style={styles.grid}>
        {picked.map((p) => (
          <Image key={p.uri} source={{ uri: p.uri }} style={styles.thumb} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700" },
  hint: { color: "#64748b", marginVertical: 12, lineHeight: 20 },
  status: { marginTop: 12, color: "#0f766e" },
  err: { color: "#dc2626", marginTop: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  thumb: { width: 100, height: 100, borderRadius: 8, backgroundColor: "#f1f5f9" },
});
