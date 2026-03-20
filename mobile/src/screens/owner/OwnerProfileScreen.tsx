import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../components/AppButton";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpfCnpj, maskPhone } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerProfile">;

export function OwnerProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  const o = user?.ownerProfile;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.row}>E-mail: {user?.email}</Text>
      <Text style={styles.row}>Papel: proprietário</Text>
      {o ? (
        <>
          <Text style={styles.row}>CPF/CNPJ: {maskCpfCnpj(o.cpfCnpj)}</Text>
          <Text style={styles.row}>
            Telefone / WhatsApp: {maskPhone(o.phone)}
          </Text>
          <Text style={styles.row}>
            Endereço: {o.logradouro}, {o.numero}
            {o.complemento ? ` — ${o.complemento}` : ""}
          </Text>
          <Text style={styles.row}>
            {o.bairro} — {o.cidade}/{o.uf} — CEP {o.cep}
          </Text>
        </>
      ) : null}
      <AppButton
        title="Editar meus dados"
        variant="ghost"
        onPress={() => navigation.navigate("OwnerProfileEdit")}
      />
      <AppButton title="Sair" variant="danger" onPress={() => void logout()} />
      <AppButton
        title="Voltar"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  row: { fontSize: 16, color: "#334155" },
});
