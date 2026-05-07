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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { validatePasswordForAuth } from "../../utils/authValidation";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AccountDeletion">;

export function AccountDeletionScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const del = trpc.auth.deleteAccount.useMutation({
    onSuccess: async () => {
      setErr(null);
      await logout();
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  const submit = () => {
    setErr(null);
    const pwdErr = validatePasswordForAuth(password);
    if (pwdErr) {
      setErr(pwdErr);
      return;
    }
    del.mutate({ password });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="bodyMedium" style={styles.warn}>
          Esta ação é permanente: seu cadastro, veículos, locações e dados
          associados serão removidos do sistema, na medida em que a lei permitir.
          Arquivos em nuvem ligados à sua conta serão apagados quando possível.
        </Text>
        <Text variant="bodyMedium" style={styles.label}>
          Digite sua senha para confirmar.
        </Text>
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
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
          onPress={submit}
          loading={del.isPending}
          disabled={del.isPending}
          style={styles.dangerBtn}
        >
          Excluir conta definitivamente
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Cancelar
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 24, gap: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
  warn: { opacity: 0.95, lineHeight: 22, marginBottom: 8 },
  label: { marginTop: 8 },
  field: { backgroundColor: "#fff" },
  dangerBtn: { marginTop: 8, borderRadius: 12 },
});
