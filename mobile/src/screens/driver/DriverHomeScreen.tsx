import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "DriverHome">;

export function DriverHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { logout } = useAuth();

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Motorista
      </Text>
      <Text variant="bodyMedium" style={styles.sub}>
        Complete o cadastro, acompanhe aprovação e solicite veículos no
        marketplace.
      </Text>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardInner}>
          <Button
            mode="contained-tonal"
            icon="card-account-details-outline"
            onPress={() => navigation.navigate("DriverPreRegister")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Pré-cadastro / endereço
          </Button>
          <Button
            mode="contained-tonal"
            icon="clipboard-check-outline"
            onPress={() => navigation.navigate("DriverStatus")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Status do cadastro
          </Button>
          <Button
            mode="contained-tonal"
            icon="store-outline"
            onPress={() => navigation.navigate("Marketplace")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Marketplace
          </Button>
          <Button
            mode="contained-tonal"
            icon="car-key"
            onPress={() => navigation.navigate("DriverRentals")}
            style={styles.rowBtn}
            contentStyle={styles.btnContent}
          >
            Minhas locações
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
