import type { NavigationProp } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";
import { useAuth } from "../hooks/AuthContext";
import { setPostLoginNavigation } from "../navigation/postLoginNavigation";
import type { RootStackParamList } from "../navigation/types";

type Props = {
  navigation: NavigationProp<RootStackParamList>;
};

export function MarketplaceHeaderActions({ navigation }: Props) {
  const { user } = useAuth();

  if (user) {
    const homeRoute =
      user.role === "OWNER"
        ? "OwnerHome"
        : user.role === "ADMIN"
          ? "AdminHub"
          : "DriverHome";

    return (
      <View style={styles.row}>
        <Button
          mode="text"
          compact
          icon="home-outline"
          onPress={() => navigation.navigate(homeRoute)}
        >
          Início
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Button
        mode="contained-tonal"
        compact
        icon="login"
        onPress={() => {
          setPostLoginNavigation(null);
          navigation.navigate("Login");
        }}
      >
        Entrar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginRight: 4 },
});
