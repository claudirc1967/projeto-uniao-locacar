import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerHome">;

export function OwnerHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { logout } = useAuth();

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Proprietário
      </Text>
      <Text variant="bodyMedium" style={styles.sub}>
        Gerencie veículos, motoristas e locações.
      </Text>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardInner}>
          <Button
            mode="contained-tonal"
            icon="account-circle-outline"
            onPress={() => navigation.navigate("OwnerProfile")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Meu perfil
          </Button>
          <Button
            mode="contained-tonal"
            icon="car-outline"
            onPress={() => navigation.navigate("OwnerVehicles")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Meus veículos
          </Button>
          <Button
            mode="contained-tonal"
            icon="account-clock-outline"
            onPress={() => navigation.navigate("OwnerPendingDrivers")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Motoristas pendentes
          </Button>
          <Button
            mode="contained-tonal"
            icon="clipboard-text-outline"
            onPress={() => navigation.navigate("OwnerRentals")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Solicitações de locação
          </Button>
          <Button
            mode="outlined"
            icon="store-outline"
            onPress={() => navigation.navigate("Marketplace")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Ver marketplace (todos)
          </Button>
        </Card.Content>
      </Card>

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
  container: { padding: 24, paddingTop: 48, paddingBottom: 40, gap: 8 },
  title: { marginBottom: 4 },
  sub: { marginBottom: 16, opacity: 0.85 },
  card: { borderRadius: 16 },
  cardInner: { gap: 8, paddingVertical: 4 },
  rowBtn: { borderRadius: 12 },
  btnContent: { justifyContent: "flex-start" },
  footer: { marginTop: 24 },
  logout: { borderRadius: 12 },
});
