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
  View,
} from "react-native";
import {
  Button,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RentalInstructions">;

export function RentalInstructionsScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    const draft = route.params?.contractTextDraft;
    if (draft === undefined) return;
    setContractText(draft);
    navigation.setParams({ contractTextDraft: undefined });
  }, [route.params?.contractTextDraft, navigation]);

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
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (detail.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>{trpcErrorMessage(detail.error)}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={styles.title}>
          Retirada e contrato
        </Text>
        <Text variant="labelLarge" style={styles.label}>
          Instruções (como / onde / quando retirar o veículo)
        </Text>
        <TextInput
          mode="outlined"
          multiline
          value={pickupInstructions}
          onChangeText={setPickup}
          placeholder="Ex.: Retirar na garagem X às 10h com documento…"
          style={styles.area}
        />
        <Text variant="labelLarge" style={styles.label}>
          Texto do contrato (opcional)
        </Text>
        <Text variant="bodySmall" style={styles.contractPreview} numberOfLines={3}>
          {contractText.trim()
            ? contractText.trim()
            : "Nenhum texto do contrato informado."}
        </Text>
        <Button
          mode="outlined"
          icon="file-document-edit-outline"
          style={styles.editContractBtn}
          onPress={() =>
            navigation.navigate("RentalContractEdit", {
              rentalId,
              initialContractText: contractText,
            })
          }
        >
          Editar contrato
        </Button>
        <Text variant="labelLarge" style={styles.label}>
          URL do contrato (opcional)
        </Text>
        <TextInput
          mode="outlined"
          value={contractUrl}
          onChangeText={setContractUrl}
          autoCapitalize="none"
          placeholder="https://..."
          style={styles.field}
        />
        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
        <Button
          mode="contained"
          loading={save.isPending}
          disabled={save.isPending}
          onPress={() => {
            setErr(null);
            const instr = pickupInstructions.trim();
            if (instr.length < 3) {
              setErr(
                "Informe as instruções de retirada (mínimo 3 caracteres)."
              );
              return;
            }
            save.mutate({
              rentalId,
              pickupInstructions: instr,
              contractText: contractText || null,
              contractUrl: contractUrl.trim() || null,
            });
          }}
        >
          Salvar e ativar locação
        </Button>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button
          mode="outlined"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          Voltar
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  container: { padding: 20, paddingBottom: 40 },
  title: { marginBottom: 12 },
  label: { marginTop: 12, opacity: 0.9 },
  field: { marginTop: 6, backgroundColor: "#fff" },
  area: { marginTop: 6, minHeight: 100, backgroundColor: "#fff" },
  contractPreview: {
    marginTop: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    opacity: 0.95,
  },
  editContractBtn: { marginTop: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  backBtn: { marginTop: 0 },
});
