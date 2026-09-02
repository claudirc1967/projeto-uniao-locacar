import type { NavigationProp } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import type { RootStackParamList } from "../navigation/types";
import { setPostLoginNavigation } from "../navigation/postLoginNavigation";

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  /** Contexto exibido acima dos botões (variante default). */
  message?: string;
  /** Se informado, após login o app reabre este veículo (fluxo motorista). */
  returnVehicleId?: string;
  /** compact: só botões — banner da lista. */
  variant?: "default" | "compact";
};

export function GuestAuthPrompt({
  navigation,
  message,
  returnVehicleId,
  variant = "default",
}: Props) {
  const theme = useTheme();
  const compact = variant === "compact";

  const goLogin = () => {
    if (returnVehicleId) {
      setPostLoginNavigation({
        name: "VehicleDetail",
        params: { vehicleId: returnVehicleId },
      });
    } else {
      setPostLoginNavigation(null);
    }
    navigation.navigate("Login");
  };

  const goSignupDriver = () => {
    if (returnVehicleId) {
      setPostLoginNavigation({
        name: "VehicleDetail",
        params: { vehicleId: returnVehicleId },
      });
    } else {
      setPostLoginNavigation(null);
    }
    navigation.navigate("Signup", { role: "DRIVER" });
  };

  const goSignupOwner = () => {
    setPostLoginNavigation(null);
    navigation.navigate("Signup", { role: "OWNER" });
  };

  return (
    <Card
      mode="elevated"
      style={[
        styles.card,
        compact ? styles.cardCompact : null,
        { backgroundColor: theme.colors.primaryContainer },
      ]}
    >
      <Card.Content style={[styles.body, compact ? styles.bodyCompact : null]}>
        {!compact ? (
          <>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onPrimaryContainer, fontWeight: "600" }}
            >
              Pronto para dar o próximo passo?
            </Text>
            {message ? (
              <Text
                variant="bodyMedium"
                style={[styles.message, { color: theme.colors.onPrimaryContainer }]}
              >
                {message}
              </Text>
            ) : null}
          </>
        ) : null}
        <View style={[styles.actions, compact ? styles.actionsCompact : null]}>
          <Button
            mode="contained"
            icon="login"
            onPress={goLogin}
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            Entrar
          </Button>
          <Button
            mode="outlined"
            icon="account-plus-outline"
            onPress={goSignupDriver}
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            Criar conta de motorista
          </Button>
          <Button
            mode="outlined"
            icon="car-outline"
            onPress={goSignupOwner}
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            Quero anunciar meu veículo
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, marginBottom: 4 },
  cardCompact: { marginBottom: 0 },
  body: { gap: 10 },
  bodyCompact: { gap: 0 },
  message: { opacity: 0.92, lineHeight: 22 },
  actions: { gap: 8, marginTop: 4 },
  actionsCompact: { marginTop: 0 },
  btn: { borderRadius: 12 },
  btnContent: { paddingVertical: 4 },
});
