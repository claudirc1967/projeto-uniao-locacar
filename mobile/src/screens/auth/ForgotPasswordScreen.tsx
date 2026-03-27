import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert,
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
          onChangeText={setEmail}
          style={styles.field}
        />
        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
        <Button
          mode="contained"
          onPress={() => forgot.mutate({ email: email.trim() })}
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
  spacer: { height: 24 },
});
