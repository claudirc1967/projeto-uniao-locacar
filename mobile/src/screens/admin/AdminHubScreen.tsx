import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MenuTile } from "../../components/MenuTile";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AdminHub">;

export function AdminHubScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 72 + insets.bottom },
        ]}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Painel admin
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {user?.email}
        </Text>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <MenuTile
              title="Anúncios"
              subtitle="Campanhas house ads"
              icon="bullhorn-outline"
              onPress={() => navigation.navigate("AdminCampaigns")}
            />
          </View>
          <View style={styles.cell}>
            <MenuTile
              title="Destaques"
              subtitle="Prioridade no marketplace"
              icon="star-outline"
              onPress={() => navigation.navigate("AdminHighlights")}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footerBar,
          {
            paddingBottom: insets.bottom,
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
          icon="logout"
          onPress={() => void logout()}
        >
          Sair
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  title: { fontWeight: "600" },
  grid: { flexDirection: "row", gap: 12, marginTop: 8 },
  cell: { flex: 1 },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
