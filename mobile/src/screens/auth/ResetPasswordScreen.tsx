import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert,
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
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const [token, setToken] = useState(route.params?.token ?? "");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      Alert.alert("Senha alterada", "Faça login com a nova senha.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Nova senha</Text>
        <Text style={styles.label}>Token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="Cole o token recebido"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <AppButton
          title="Redefinir"
          loading={reset.isPending}
          onPress={() => reset.mutate({ token: token.trim(), password })}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 48, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  label: { fontSize: 14, color: "#64748b", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  err: { color: "#dc2626" },
});
