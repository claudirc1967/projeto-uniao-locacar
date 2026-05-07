import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../navigation/types";
import { PrivacyPolicyBody } from "./PrivacyPolicyContent";

type Props = NativeStackScreenProps<RootStackParamList, "PrivacyPolicy">;

export function PrivacyPolicyScreen(_props: Props) {
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
        <PrivacyPolicyBody />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 16, gap: 8 },
  title: { marginBottom: 8, fontWeight: "600" },
});
