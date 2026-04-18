import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeMixedMenuGrid } from "../../components/HomeMixedMenuGrid";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerHome">;

export function OwnerHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();

  const greeting =
    user?.ownerProfile?.nomeRazaoSocial ??
    user?.email?.split("@")[0] ??
    "Proprietário";

  /**
   * No Android o inset inferior costuma vir 0 no Expo/RN, enquanto a barra de
   * navegação (3 botões ou gestos) continua sobrepondo o conteúdo. Garantimos
   * um mínimo em dp próximo à altura típica da barra + insets quando existirem.
   */
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
        <Text variant="titleLarge" style={styles.greeting}>
          Olá, {greeting}
        </Text>
        <Text variant="bodyMedium" style={styles.sub}>
          Gerencie veículos, motoristas e locações.
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
          pairFeaturedWithFirst
          featured={{
            key: "profile",
            title: "Meu perfil",
            subtitle: "Dados e contato",
            icon: "account-circle-outline",
            onPress: () => navigation.navigate("OwnerProfile"),
          }}
          items={[
            {
              key: "vehicles",
              title: "Meus veículos",
              subtitle: "Cadastro e fotos",
              icon: "car-outline",
              onPress: () => navigation.navigate("OwnerVehicles"),
            },
            {
              key: "partners",
              title: "Parceiros",
              subtitle: "Fornecedores e seguradora",
              icon: "handshake-outline",
              onPress: () => navigation.navigate("OwnerPartners"),
            },
            {
              key: "pending",
              title: "Motoristas pendentes",
              subtitle: "Aprovar cadastros",
              icon: "account-clock-outline",
              onPress: () => navigation.navigate("OwnerPendingDrivers"),
            },
            {
              key: "rentals",
              title: "Solicitações de locação",
              subtitle: "Pedidos recebidos",
              icon: "clipboard-text-outline",
              onPress: () => navigation.navigate("OwnerRentals"),
            },
            {
              key: "marketplace",
              title: "Marketplace",
              subtitle: "Ver todos os veículos",
              icon: "store-outline",
              onPress: () => navigation.navigate("Marketplace"),
            },
          ]}
        />
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
    paddingBottom: 16,
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
