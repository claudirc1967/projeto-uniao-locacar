import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
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
  const [pickupInstructions, setPickup] = useState("");
  const [contractText, setContractText] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const save = trpc.owner.setRentalPickupAndContract.useMutation({
    onSuccess: async () => {
      await utils.owner.listIncomingRentals.invalidate();
      navigation.goBack();
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

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
