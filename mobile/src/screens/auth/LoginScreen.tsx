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
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import {
  validateEmailForAuth,
  validatePasswordForAuth,
} from "../../utils/authValidation";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { loginWithToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
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
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMedium" style={styles.title}>
          Entrar
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Acesse com seu e-mail e senha
        </Text>

        <TextInput
          mode="outlined"
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          style={styles.field}
        />

        <TextInput
          mode="outlined"
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          autoComplete="password"
          textContentType="password"
          style={styles.field}
          right={
            <TextInput.Icon
              icon={secure ? "eye-outline" : "eye-off-outline"}
              onPress={() => setSecure((s) => !s)}
            />
          }
        />

        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>

        <Button
          mode="contained"
          onPress={() => {
            setErr(null);
            const emailErr = validateEmailForAuth(email);
            if (emailErr) {
              setErr(emailErr);
              return;
            }
            const pwdErr = validatePasswordForAuth(password);
            if (pwdErr) {
              setErr(pwdErr);
              return;
            }
            login.mutate({ email: email.trim(), password });
          }}
          loading={login.isPending}
          disabled={login.isPending}
          style={styles.primaryBtn}
          contentStyle={styles.btnContent}
        >
          Entrar
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate("Signup")}
          style={styles.linkBtn}
        >
          Criar conta
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.linkBtn}
        >
          Esqueci a senha
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate("PrivacyPolicy")}
          style={styles.linkBtn}
        >
          Política de Privacidade
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate("TermsOfUse")}
          style={styles.linkBtn}
        >
          Termos de uso
        </Button>

        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 24,
    paddingTop: 48,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  title: { marginBottom: 4 },
  subtitle: { marginBottom: 20, opacity: 0.85 },
  field: { marginBottom: 4, backgroundColor: "#fff" },
  primaryBtn: { marginTop: 8 },
  btnContent: { paddingVertical: 6 },
  linkBtn: { marginTop: 4 },
  spacer: { height: 24 },
});
