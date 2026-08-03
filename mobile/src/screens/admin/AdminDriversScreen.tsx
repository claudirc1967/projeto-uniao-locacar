import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpf, maskPhone } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminDrivers">;

type SearchInput = {
  cpf?: string;
  phone?: string;
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendente de revisão",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
};

export function AdminDriversScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [searchInput, setSearchInput] = useState<SearchInput | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const findQ = trpc.admin.drivers.findByIdentity.useQuery(searchInput!, {
    enabled: searchInput !== null && user?.role === "ADMIN",
  });

  const onSearch = () => {
    const cpfVal = cpf.trim();
    const tel = phone.trim();
    if (!cpfVal && !tel) {
      setFormErr("Informe CPF ou telefone do motorista.");
      return;
    }
    setFormErr(null);
    setSearchInput({
      ...(cpfVal ? { cpf: cpfVal } : {}),
      ...(tel ? { phone: tel } : {}),
    });
  };

  const onClear = () => {
    setCpf("");
    setPhone("");
    setSearchInput(null);
    setFormErr(null);
  };

  const showResults = searchInput !== null;
  const driver = showResults && !findQ.isError ? findQ.data?.driver : undefined;
  const queryErr =
    showResults && findQ.isError ? trpcErrorMessage(findQ.error) : null;

  if (user?.role !== "ADMIN") {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyMedium" style={{ textAlign: "center", marginBottom: 16 }}>
          Disponível apenas para administradores.
        </Text>
        <Button mode="outlined" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 72 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="bodyMedium" style={styles.lead}>
          Busque qualquer motorista por CPF e/ou telefone (pendente, aprovado ou
          reprovado) para ver o cadastro completo.
        </Text>

        <TextInput
          mode="outlined"
          label="CPF do motorista"
          value={cpf}
          onChangeText={(t) => setCpf(maskCpf(t))}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Telefone do motorista"
          value={phone}
          onChangeText={(t) => setPhone(maskPhone(t))}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <HelperText type="error" visible={!!formErr}>
          {formErr ?? ""}
        </HelperText>

        <View style={styles.actions}>
          <Button mode="contained" onPress={onSearch} loading={findQ.isFetching}>
            Buscar
          </Button>
          <Button mode="outlined" onPress={onClear} disabled={!showResults && !cpf && !phone}>
            Limpar
          </Button>
        </View>

        <Button
          mode="text"
          icon="account-clock-outline"
          onPress={() => navigation.navigate("OwnerPendingDrivers")}
          style={styles.linkBtn}
        >
          Ver fila de revisão (pendentes / reprovados)
        </Button>

        {showResults && findQ.isFetching ? (
          <Text variant="bodyMedium" style={styles.hint}>
            Buscando…
          </Text>
        ) : null}

        {queryErr ? (
          <HelperText type="error" visible>
            {queryErr}
          </HelperText>
        ) : null}

        {driver ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.name}>
                  {driver.fullName?.trim() || "Sem nome"}
                </Text>
                <Chip compact mode="outlined">
                  {statusLabel[driver.status] ?? driver.status}
                </Chip>
              </View>
              <Text variant="bodyMedium">E-mail: {driver.email}</Text>
              <Text variant="bodyMedium">
                Telefone: {driver.phone ? maskPhone(driver.phone) : "—"}
              </Text>
              <Text variant="bodyMedium">
                CPF: {driver.cpf ? maskCpf(driver.cpf) : "—"}
              </Text>
              <Text variant="bodyMedium">CNH: {driver.cnh?.trim() || "—"}</Text>
              {driver.status === "REJECTED" && driver.rejectionReason?.trim() ? (
                <Text
                  variant="bodySmall"
                  style={[styles.reason, { color: theme.colors.error }]}
                >
                  Motivo da reprovação: {driver.rejectionReason.trim()}
                </Text>
              ) : null}
              <Button
                mode="contained"
                style={styles.detailBtn}
                onPress={() =>
                  navigation.navigate("OwnerDriverProfile", {
                    driverUserId: driver.driverUserId,
                  })
                }
              >
                Ver cadastro completo
              </Button>
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  scroll: { padding: 16, gap: 4 },
  lead: { opacity: 0.85, marginBottom: 12, lineHeight: 20 },
  input: { marginBottom: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 8 },
  linkBtn: { alignSelf: "flex-start", marginBottom: 8 },
  hint: { marginTop: 8, opacity: 0.7 },
  card: { marginTop: 12 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  name: { flex: 1 },
  reason: { marginTop: 8, lineHeight: 18 },
  detailBtn: { marginTop: 16 },
});
