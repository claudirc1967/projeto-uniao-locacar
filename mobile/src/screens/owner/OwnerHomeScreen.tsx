import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { HomeMixedMenuGrid } from "../../components/HomeMixedMenuGrid";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerHome">;

export function OwnerHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { logout, user } = useAuth();

  const greeting =
    user?.ownerProfile?.nomeRazaoSocial ??
    user?.email?.split("@")[0] ??
    "Proprietário";

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.greeting}>
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
