import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Searchbar, Text, Button, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpfCnpj } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminOwners">;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function AdminOwnersScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const listQ = trpc.admin.owners.list.useQuery(undefined, {
    enabled: user?.role === "ADMIN",
  });

  const filtered = useMemo(() => {
    const items = listQ.data ?? [];
    const q = normalizeSearch(query);
    if (!q) return items;
    return items.filter((o) => {
      const haystack = [
        o.nomeRazaoSocial,
        o.accountEmail,
        o.emailLocador,
        o.cpfCnpj,
        o.phone,
        o.cidade,
        o.uf,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listQ.data, query]);

  if (listQ.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (listQ.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {trpcErrorMessage(listQ.error)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.ownerUserId}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 8 + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Somente visualização. Toque em um locador para ver perfil e veículos.
            </Text>
            <Searchbar
              placeholder="Buscar por nome, e-mail, CPF/CNPJ, cidade…"
              value={query}
              onChangeText={setQuery}
              style={styles.search}
            />
            <Text variant="labelLarge" style={{ opacity: 0.85 }}>
              {filtered.length} locador{filtered.length === 1 ? "" : "es"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhum locador encontrado.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("AdminOwnerDetail", {
                ownerUserId: item.ownerUserId,
              })
            }
          >
            <Card mode="elevated" style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text variant="titleMedium">
                  {item.nomeRazaoSocial?.trim() || item.accountEmail}
                </Text>
                <Text variant="bodySmall" style={styles.meta}>
                  {item.accountEmail}
                  {item.cidade && item.uf
                    ? ` · ${item.cidade}/${item.uf}`
                    : ""}
                </Text>
                <Text variant="bodySmall" style={styles.meta}>
                  {item.cpfCnpj ? maskCpfCnpj(item.cpfCnpj) : "CPF/CNPJ não informado"}
                  {" · "}
                  {item.vehicleCount} veículo{item.vehicleCount === 1 ? "" : "s"}
                </Text>
                <View style={styles.chips}>
                  {!item.profileComplete ? (
                    <Chip compact icon="alert-circle-outline" mode="outlined">
                      {item.profileIssues.length} pendência
                      {item.profileIssues.length === 1 ? "" : "s"}
                    </Chip>
                  ) : (
                    <Chip compact icon="check-circle-outline" mode="outlined">
                      Perfil completo
                    </Chip>
                  )}
                  {!item.hasContractTemplate ? (
                    <Chip compact icon="file-document-outline" mode="outlined">
                      Sem contrato
                    </Chip>
                  ) : null}
                </View>
                <Text variant="labelSmall" style={styles.tapHint}>
                  Toque para ver detalhes
                </Text>
              </Card.Content>
            </Card>
          </Pressable>
        )}
      />
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 12 },
  header: { gap: 12, marginBottom: 4 },
  search: { borderRadius: 12 },
  card: { borderRadius: 16, marginBottom: 12 },
  cardContent: { gap: 6 },
  meta: { opacity: 0.85 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tapHint: { opacity: 0.65, marginTop: 4 },
  empty: { opacity: 0.75, textAlign: "center", paddingVertical: 24 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
