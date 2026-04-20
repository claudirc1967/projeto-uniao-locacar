import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { HomeMixedMenuGrid } from "../../components/HomeMixedMenuGrid";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "DriverHome">;

export function DriverHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { logout, user } = useAuth();

  const greeting =
    user?.driverProfile?.fullName ??
    user?.email?.split("@")[0] ??
    "Motorista";

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.greeting}>
        Olá, {greeting}
      </Text>
      <Text variant="bodyMedium" style={styles.sub}>
        Complete o cadastro, acompanhe aprovação e solicite veículos no
        marketplace.
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
          title: "Marketplace",
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
            key: "privacy",
            title: "Privacidade e conta",
            subtitle: "Política e exclusão de conta",
            icon: "shield-account-outline",
            onPress: () => navigation.navigate("AccountPrivacy"),
          },
        ]}
      />

      <View style={styles.footer}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 40, paddingBottom: 40, gap: 12 },
  greeting: { fontWeight: "600" },
  sub: { opacity: 0.9, marginTop: 4 },
  email: { marginTop: -4, marginBottom: 8 },
  footer: { marginTop: 16 },
  logout: { borderRadius: 12 },
  btnContent: { justifyContent: "center" },
});
