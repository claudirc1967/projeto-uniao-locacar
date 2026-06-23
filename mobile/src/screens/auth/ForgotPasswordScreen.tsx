import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
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
import { trpc } from "../../api/trpc";
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const forgot = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setErr(null);
      const dev = "devResetToken" in data ? data.devResetToken : undefined;
      if (dev) {
        setDevResetToken(dev);
        setSuccess(
          "Ambiente de desenvolvimento: token gerado. Use o botão abaixo para redefinir a senha."
        );
      } else {
        setDevResetToken(null);
        setSuccess(
          "Se o e-mail existir, você receberá instruções em breve. Verifique também a caixa de spam."
        );
      }
    },
    onError: (e) => {
      setSuccess(null);
      setDevResetToken(null);
      setErr(trpcErrorMessage(e));
    },
  });

  const onSend = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErr("Informe seu e-mail.");
      setSuccess(null);
      return;
    }
    setErr(null);
    setSuccess(null);
    setDevResetToken(null);
    forgot.mutate({ email: trimmed });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall">Esqueci a senha</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Informe seu e-mail. Em ambiente de desenvolvimento o token pode ser
          exibido na tela seguinte.
        </Text>
        <TextInput
          mode="outlined"
          label="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (err) setErr(null);
            if (success) {
              setSuccess(null);
              setDevResetToken(null);
            }
          }}
          style={styles.field}
        />
        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
        {success ? (
          <Text
            variant="bodyMedium"
            style={[styles.success, { color: theme.colors.primary }]}
          >
            {success}
          </Text>
        ) : null}
        {devResetToken ? (
          <Button
            mode="outlined"
            onPress={() =>
              navigation.navigate("ResetPassword", { token: devResetToken })
            }
            style={styles.btn}
          >
            Ir para redefinir senha
          </Button>
        ) : null}
        <Button
          mode="contained"
          onPress={onSend}
          loading={forgot.isPending}
          disabled={forgot.isPending}
          style={styles.btn}
        >
          Enviar
        </Button>
        <Button mode="text" onPress={() => navigation.navigate("Login")}>
          Voltar ao login
        </Button>
        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48, paddingBottom: 40, gap: 8 },
  hint: { marginVertical: 8, opacity: 0.9 },
  field: { backgroundColor: "#fff" },
  btn: { marginTop: 8 },
  success: { marginTop: 4, lineHeight: 22 },
  spacer: { height: 24 },
});
