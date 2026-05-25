import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdSlot } from "../../components/ads/AdSlot";
import { HomeMixedMenuGrid } from "../../components/HomeMixedMenuGrid";
import { AD_PLACEMENTS } from "../../constants/adPlacements";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { firstNameFromDisplayName } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "DriverHome">;

export function DriverHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();

  const greeting =
    firstNameFromDisplayName(user?.driverProfile?.fullName) ||
    user?.email?.split("@")[0] ||
    "Motorista";

  const bottomInset =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 56)
      : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
      >
        <Text
          variant="headlineSmall"
          style={styles.greeting}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Olá, {greeting}
        </Text>
        {user?.email ? (
          <Text
            variant="bodySmall"
            style={[styles.email, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {user.email}
          </Text>
        ) : null}

        <HomeMixedMenuGrid
          featured={{
            key: "marketplace",
            title: "Veículos disponíveis",
            subtitle: "Buscar veículos disponíveis",
            icon: "store-outline",
            onPress: () => navigation.navigate("Marketplace"),
          }}
          items={[
            {
              key: "preregister",
              title: "Pré-cadastro",
              subtitle: "Endereço e documentos",
              icon: "card-account-details-outline",
              onPress: () => navigation.navigate("DriverPreRegister"),
            },
            {
              key: "status",
              title: "Status do cadastro",
              subtitle: "Aprovação e pendências",
              icon: "clipboard-check-outline",
              onPress: () => navigation.navigate("DriverStatus"),
            },
            {
              key: "rentals",
              title: "Minhas locações",
              subtitle: "Contratos e veículos",
              icon: "car-key",
              onPress: () => navigation.navigate("DriverRentals"),
            },
            {
              key: "terms",
              title: "Termos de uso",
              subtitle: "Regras da plataforma",
              icon: "file-document-outline",
              onPress: () => navigation.navigate("TermsOfUse"),
            },
            {
              key: "privacy",
              title: "Privacidade e conta",
              subtitle: "Política e exclusão de conta",
              icon: "shield-account-outline",
              onPress: () => navigation.navigate("AccountPrivacy"),
            },
          ]}
        />

        <AdSlot placement={AD_PLACEMENTS.DRIVER_HOME} />
      </ScrollView>

      <View
        style={[
          styles.footerBar,
          {
            paddingBottom: bottomInset,
            borderTopColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
          icon="logout"
          onPress={() => void logout()}
          style={styles.logout}
          contentStyle={styles.btnContent}
        >
          Sair
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 24,
    gap: 12,
  },
  greeting: { fontWeight: "600" },
  sub: { opacity: 0.9, marginTop: 4 },
  email: { marginTop: -4, marginBottom: 8 },
  footerBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logout: { borderRadius: 12 },
  btnContent: { justifyContent: "center" },
});
