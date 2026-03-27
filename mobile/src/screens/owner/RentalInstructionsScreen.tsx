import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RentalInstructions">;

export function RentalInstructionsScreen({ navigation, route }: Props) {
  const { rentalId } = route.params;
  const detail = trpc.owner.getIncomingRentalDetail.useQuery({ rentalId });
  const [pickupInstructions, setPickup] = useState("");
  const [contractText, setContractText] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!detail.data) return;
    setPickup(detail.data.pickupInstructions ?? "");
    setContractText(detail.data.contractText ?? "");
    setContractUrl(detail.data.contractUrl ?? "");
  }, [detail.data]);

  const utils = trpc.useUtils();
  const save = trpc.owner.setRentalPickupAndContract.useMutation({
    onSuccess: async (data) => {
      await utils.owner.listIncomingRentals.invalidate();

      const url = data?.contractUrl?.trim?.() ? data.contractUrl : null;
      if (!url) {
        navigation.goBack();
        return;
      }

      setContractUrl(url);
      Alert.alert(
        "Locação ativada",
        "Contrato em PDF gerado. O que deseja fazer?",
        [
          {
            text: "Compartilhar PDF",
            onPress: () =>
              void (async () => {
                try {
                  const base =
                    (FileSystem as any).cacheDirectory ??
                    (FileSystem as any).documentDirectory;
                  if (!base) throw new Error("Diretório do app indisponível.");
                  const localUri = `${base}contract-${rentalId}.pdf`;
                  await FileSystem.downloadAsync(url, localUri);
                  await Sharing.shareAsync(localUri, {
                    mimeType: "application/pdf",
                    dialogTitle: "Contrato de locação",
                  });
                } catch (e) {
                  setErr(
                    `Falha ao baixar/compartilhar o PDF (${e instanceof Error ? e.message : "erro desconhecido"}).`
                  );
                }
              })(),
          },
          { text: "Abrir link", onPress: () => void Linking.openURL(url) },
          { text: "Fechar", style: "cancel", onPress: () => navigation.goBack() },
        ]
      );
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  if (detail.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (detail.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{trpcErrorMessage(detail.error)}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Retirada e contrato</Text>
        <Text style={styles.label}>
          Instruções (como / onde / quando retirar o veículo)
        </Text>
        <TextInput
          style={[styles.input, styles.area]}
          multiline
          value={pickupInstructions}
          onChangeText={setPickup}
          placeholder="Ex.: Retirar na garagem X às 10h com documento…"
        />
        <Text style={styles.label}>Texto do contrato (opcional)</Text>
        <TextInput
          style={[styles.input, styles.area]}
          multiline
          value={contractText}
          onChangeText={setContractText}
        />
        <Text style={styles.label}>URL do contrato (opcional)</Text>
        <TextInput
          style={styles.input}
          value={contractUrl}
          onChangeText={setContractUrl}
          autoCapitalize="none"
          placeholder="https://..."
        />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <AppButton
          title="Salvar e ativar locação"
          loading={save.isPending}
          onPress={() =>
            save.mutate({
              rentalId,
              pickupInstructions,
              contractText: contractText || null,
              contractUrl: contractUrl.trim() || null,
            })
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 13, color: "#64748b", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 6,
  },
  area: { minHeight: 100, textAlignVertical: "top" },
  err: { color: "#dc2626", marginTop: 12 },
});
