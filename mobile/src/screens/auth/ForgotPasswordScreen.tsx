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

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const forgot = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setErr(null);
      const dev = "devResetToken" in data ? data.devResetToken : undefined;
      if (dev) {
        Alert.alert(
          "Desenvolvimento",
          `Token de reset (somente dev): ${dev}`,
          [
            {
              text: "Ir para reset",
              onPress: () =>
                navigation.navigate("ResetPassword", { token: dev }),
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert(
          "Enviado",
          "Se o e-mail existir, você receberá instruções em breve."
        );
      }
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Esqueci a senha</Text>
        <Text style={styles.hint}>
          Informe seu e-mail. Em ambiente de desenvolvimento o token pode ser
          exibido na tela seguinte.
        </Text>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <AppButton
          title="Enviar"
          loading={forgot.isPending}
          onPress={() => forgot.mutate({ email: email.trim() })}
        />
        <AppButton
          title="Voltar ao login"
          variant="ghost"
          onPress={() => navigation.navigate("Login")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 48, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  hint: { color: "#64748b", marginVertical: 8 },
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
