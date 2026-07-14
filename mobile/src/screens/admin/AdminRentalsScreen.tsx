import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { maskCpfCnpj, maskPhone } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminRentals">;

const statusLabel: Record<string, string> = {
  PENDING_OWNER: "Aguardando locador",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

type SearchInput = {
  cpfCnpj?: string;
  phone?: string;
};

export function AdminRentalsScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [searchInput, setSearchInput] = useState<SearchInput | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const listQ = trpc.admin.rentals.listByOwnerIdentity.useQuery(searchInput!, {
    enabled: searchInput !== null && user?.role === "ADMIN",
  });

  const onSearch = () => {
    const cpf = cpfCnpj.trim();
    const tel = phone.trim();
    if (!cpf && !tel) {
      setFormErr("Informe CPF/CNPJ ou telefone do locador.");
      return;
    }
    setFormErr(null);
    setSearchInput({
      ...(cpf ? { cpfCnpj: cpf } : {}),
      ...(tel ? { phone: tel } : {}),
    });
  };

  const onClear = () => {
    setCpfCnpj("");
    setPhone("");
    setSearchInput(null);
    setFormErr(null);
  };

  const showResults = searchInput !== null;
  const loading = showResults && listQ.isLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={showResults && !listQ.isError ? (listQ.data?.rentals ?? []) : []}
        keyExtractor={(item) => item.rentalId}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 72 + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="bodyMedium" style={styles.lead}>
              Busque o locador por CPF/CNPJ e/ou telefone para ver todas as
              solicitações de locação dos veículos dele.
            </Text>

            <TextInput
              mode="outlined"
              label="CPF/CNPJ do locador"
              value={cpfCnpj}
              onChangeText={(t) => setCpfCnpj(maskCpfCnpj(t))}
              keyboardType="number-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Telefone do locador"
              value={phone}
              onChangeText={(t) => setPhone(maskPhone(t))}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <HelperText type="error" visible={!!formErr}>
              {formErr ?? ""}
            </HelperText>

            <View style={styles.searchRow}>
              <Button mode="contained" onPress={onSearch} style={styles.searchBtn}>
                Buscar
              </Button>
              {showResults ? (
                <Button mode="outlined" onPress={onClear}>
                  Limpar
                </Button>
              ) : null}
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
                style={styles.loader}
              />
            ) : null}

            {showResults && listQ.isError ? (
              <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                {trpcErrorMessage(listQ.error)}
              </Text>
            ) : null}

            {showResults && listQ.data ? (
              <Card mode="outlined" style={styles.ownerCard}>
                <Card.Content style={styles.ownerCardContent}>
                  <Text variant="titleMedium">
                    {listQ.data.owner.nomeRazaoSocial ?? "Locador"}
                  </Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    {listQ.data.rentals.length === 1
                      ? "1 solicitação"
                      : `${listQ.data.rentals.length} solicitações`}
                  </Text>
                </Card.Content>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showResults && !loading && !listQ.isError ? (
            <Text variant="bodyMedium" style={styles.empty}>
              Nenhuma solicitação para este locador.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardGap}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text variant="titleMedium">{item.vehicle.title}</Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    Placa: {item.vehicle.plate}
                  </Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    Motorista: {item.driverName?.trim() || item.driverEmail}
                  </Text>
                </View>
                <Chip compact mode="flat" style={styles.statusChip}>
                  {statusLabel[item.status] ?? item.status}
                </Chip>
              </View>
              <Button
                mode="outlined"
                icon="eye-outline"
                onPress={() =>
                  navigation.navigate("AdminRentalDetail", {
                    rentalId: item.rentalId,
                  })
                }
              >
                Ver detalhes da solicitação
              </Button>
            </Card.Content>
          </Card>
        )}
      />

      <View
        style={[
          styles.footerBar,
          {
            paddingBottom: insets.bottom,
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, gap: 12 },
  header: { gap: 8, marginBottom: 8 },
  lead: { opacity: 0.85, marginBottom: 4 },
  input: { backgroundColor: "transparent" },
  searchRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  searchBtn: { flexGrow: 1 },
  loader: { marginTop: 16 },
  ownerCard: { marginTop: 8 },
  ownerCardContent: { gap: 4 },
  card: { marginBottom: 4 },
  cardGap: { gap: 12 },
  cardHeader: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cardTitleWrap: { flex: 1, gap: 2 },
  statusChip: { alignSelf: "flex-start" },
  meta: { opacity: 0.85 },
  empty: { textAlign: "center", opacity: 0.75, marginTop: 8 },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
