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
import { PasswordInput } from "../../components/PasswordInput";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { loginWithToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      setErr(null);
      await loginWithToken(data.token);
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>Senha</Text>
        <PasswordInput value={password} onChangeText={setPassword} />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <AppButton
          title="Entrar"
          loading={login.isPending}
          onPress={() => login.mutate({ email: email.trim(), password })}
        />
        <AppButton
          title="Criar conta"
          variant="ghost"
          onPress={() => navigation.navigate("Signup")}
        />
        <AppButton
          title="Esqueci a senha"
          variant="ghost"
          onPress={() => navigation.navigate("ForgotPassword")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 48, gap: 8 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 14, color: "#64748b", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  err: { color: "#dc2626", marginTop: 8 },
});
