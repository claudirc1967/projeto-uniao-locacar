import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpfCnpj, maskPhone } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerProfile">;

export function OwnerProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user, logout } = useAuth();

  const o = user?.ownerProfile;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Perfil
      </Text>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.gap}>
          <Text variant="bodyMedium">E-mail: {user?.email}</Text>
          <Text variant="bodyMedium">Papel: proprietário</Text>
          {o ? (
            <>
              <Text variant="bodyMedium">
                Nome/Razão Social: {o.nomeRazaoSocial?.trim() || "—"}
              </Text>
              <Text variant="bodyMedium">
                E-mail locador: {o.emailLocador?.trim() || "—"}
              </Text>
              <Text variant="bodyMedium">
                Template de contrato:{" "}
                {o.contractTemplateText?.trim() ? "configurado" : "não configurado"}
              </Text>
              <Text variant="bodyMedium">CPF/CNPJ: {maskCpfCnpj(o.cpfCnpj)}</Text>
              <Text variant="bodyMedium">
                Telefone / WhatsApp: {maskPhone(o.phone)}
              </Text>
              <Text variant="bodyMedium">
                Endereço: {o.logradouro}, {o.numero}
                {o.complemento ? ` — ${o.complemento}` : ""}
              </Text>
              <Text variant="bodyMedium">
                {o.bairro} — {o.cidade}/{o.uf} — CEP {o.cep}
              </Text>
            </>
          ) : null}
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        icon="pencil-outline"
        onPress={() => navigation.navigate("OwnerProfileEdit")}
        style={styles.btn}
      >
        Editar meus dados
      </Button>
      <Button
        mode="contained"
        buttonColor={theme.colors.error}
        textColor={theme.colors.onError}
        icon="logout"
        onPress={() => void logout()}
        style={styles.btn}
      >
        Sair
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>
        Voltar
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48, paddingBottom: 40, gap: 12 },
  title: { marginBottom: 8 },
  card: { borderRadius: 16 },
  gap: { gap: 8 },
  btn: { borderRadius: 12 },
});
