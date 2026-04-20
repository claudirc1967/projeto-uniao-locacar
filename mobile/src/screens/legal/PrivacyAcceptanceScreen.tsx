import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { PRIVACY_POLICY_VERSION } from "../../constants/privacyPolicyVersion";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";
import { PrivacyPolicyBody } from "./PrivacyPolicyContent";

type Props = NativeStackScreenProps<RootStackParamList, "PrivacyAcceptance">;

export function PrivacyAcceptanceScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [err, setErr] = useState<string | null>(null);

  const accept = trpc.auth.acceptPrivacyPolicy.useMutation({
    onSuccess: async () => {
      setErr(null);
      await utils.auth.me.invalidate();
      const role = user?.role ?? "DRIVER";
      navigation.reset({
        index: 0,
        routes: [{ name: role === "OWNER" ? "OwnerHome" : "DriverHome" }],
      });
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 24 + insets.bottom },
        ]}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Política de privacidade atualizada
        </Text>
        <Text variant="bodyMedium" style={styles.intro}>
          Para continuar usando o aplicativo, leia e aceite a política abaixo.
        </Text>
        <PrivacyPolicyBody />
        {err ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {err}
          </Text>
        ) : null}
        <Button
          mode="contained"
          onPress={() =>
            accept.mutate({ version: PRIVACY_POLICY_VERSION })
          }
          loading={accept.isPending}
          disabled={accept.isPending}
          style={styles.btn}
        >
          Li e aceito
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 24, gap: 12 },
  title: { fontWeight: "600" },
  intro: { opacity: 0.9, marginBottom: 8 },
  btn: { marginTop: 8, borderRadius: 12 },
});
