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
import {
  validatePasswordForAuth,
  validateResetToken,
} from "../../utils/authValidation";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const [token, setToken] = useState(route.params?.token ?? "");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
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
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall">Nova senha</Text>
        <TextInput
          mode="outlined"
          label="Token"
          value={token}
          onChangeText={setToken}
          placeholder="Cole o token recebido"
          autoCapitalize="none"
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Nova senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
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
            const tokenErr = validateResetToken(token);
            if (tokenErr) {
              setErr(tokenErr);
              return;
            }
            const pwdErr = validatePasswordForAuth(password);
            if (pwdErr) {
              setErr(pwdErr);
              return;
            }
            reset.mutate({ token: token.trim(), password });
          }}
          loading={reset.isPending}
          disabled={reset.isPending}
          style={styles.btn}
        >
          Redefinir
        </Button>
        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48, paddingBottom: 40, gap: 8 },
  field: { marginBottom: 4, backgroundColor: "#fff" },
  btn: { marginTop: 8 },
  spacer: { height: 24 },
});
