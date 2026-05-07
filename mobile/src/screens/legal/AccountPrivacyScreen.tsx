import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AccountPrivacy">;

export function AccountPrivacyScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 24 + insets.bottom },
        ]}
      >
        <Text variant="bodyMedium" style={styles.sub}>
          Consulte como tratamos seus dados ou exclua sua conta neste
          dispositivo.
        </Text>
        <Button
          mode="contained-tonal"
          icon="shield-account-outline"
          onPress={() => navigation.navigate("PrivacyPolicy")}
          style={styles.btn}
        >
          Política de Privacidade
        </Button>
        <Button
          mode="outlined"
          textColor={theme.colors.error}
          icon="account-remove-outline"
          onPress={() => navigation.navigate("AccountDeletion")}
          style={styles.btn}
        >
          Excluir minha conta
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 24, gap: 12 },
  title: { fontWeight: "600" },
  sub: { opacity: 0.9, marginBottom: 8, lineHeight: 22 },
  btn: { borderRadius: 12 },
});
