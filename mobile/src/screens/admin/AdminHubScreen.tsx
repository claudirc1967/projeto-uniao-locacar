import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { MenuTile } from "../../components/MenuTile";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AdminHub">;

export function AdminHubScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();

  const pendingDriversQ = trpc.owner.listPendingDrivers.useQuery(undefined, {
    enabled: user?.role === "ADMIN",
    staleTime: 30_000,
  });
  const pendingDriversCount = pendingDriversQ.data?.length ?? 0;

  const ownersQ = trpc.admin.owners.list.useQuery(undefined, {
    enabled: user?.role === "ADMIN",
    staleTime: 60_000,
  });
  const ownersWithIssues =
    ownersQ.data?.filter((o) => !o.profileComplete).length ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (user?.role === "ADMIN") {
        void pendingDriversQ.refetch();
        void ownersQ.refetch();
      }
    }, [ownersQ, pendingDriversQ, user?.role])
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 72 + insets.bottom },
        ]}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Painel admin
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {user?.email}
        </Text>

        {pendingDriversCount > 0 ? (
          <Card
            mode="elevated"
            style={[
              styles.pendingCard,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <Card.Content style={styles.pendingCardContent}>
              <View style={styles.pendingTextWrap}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSecondaryContainer }}
                >
                  {pendingDriversCount === 1
                    ? "1 cadastro de motorista para revisar"
                    : `${pendingDriversCount} cadastros de motoristas para revisar`}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.pendingHint,
                    { color: theme.colors.onSecondaryContainer },
                  ]}
                >
                  Motoristas já podem solicitar locação após o pré-cadastro. Use
                  esta fila para revisão ou reprovação na plataforma.
                </Text>
              </View>
              <Button
                mode="contained"
                icon="account-check-outline"
                onPress={() => navigation.navigate("OwnerPendingDrivers")}
              >
                Analisar agora
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {ownersWithIssues > 0 ? (
          <Card
            mode="elevated"
            style={[
              styles.pendingCard,
              { backgroundColor: theme.colors.tertiaryContainer },
            ]}
          >
            <Card.Content style={styles.pendingCardContent}>
              <View style={styles.pendingTextWrap}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onTertiaryContainer }}
                >
                  {ownersWithIssues === 1
                    ? "1 locador com pendências no perfil"
                    : `${ownersWithIssues} locadores com pendências no perfil`}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.pendingHint,
                    { color: theme.colors.onTertiaryContainer },
                  ]}
                >
                  Verifique cadastro e dados de contato (somente leitura).
                </Text>
              </View>
              <Button
                mode="contained"
                icon="account-tie-outline"
                onPress={() => navigation.navigate("AdminOwners")}
              >
                Ver locadores
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        <View style={styles.grid}>
          <View style={styles.cell}>
            <MenuTile
              title="Anúncios"
              subtitle="Campanhas house ads"
              icon="bullhorn-outline"
              onPress={() => navigation.navigate("AdminCampaigns")}
            />
          </View>
          <View style={styles.cell}>
            <MenuTile
              title="Destaques"
              subtitle="Prioridade no marketplace"
              icon="star-outline"
              onPress={() => navigation.navigate("AdminHighlights")}
            />
          </View>
        </View>

        <MenuTile
          fullWidth
          title="Solicitações de locação"
          subtitle="Buscar por CPF/telefone do locador"
          icon="clipboard-text-outline"
          onPress={() => navigation.navigate("AdminRentals")}
        />
        <MenuTile
          fullWidth
          title="Motoristas"
          subtitle={
            pendingDriversCount > 0
              ? `${pendingDriversCount} para revisar`
              : "Revisar cadastros"
          }
          icon="account-clock-outline"
          onPress={() => navigation.navigate("OwnerPendingDrivers")}
        />
        <MenuTile
          fullWidth
          title="Locadores"
          subtitle={
            ownersWithIssues > 0
              ? `${ownersWithIssues} com pendências · ${ownersQ.data?.length ?? 0} no total`
              : `${ownersQ.data?.length ?? 0} cadastrado${ownersQ.data?.length === 1 ? "" : "s"}`
          }
          icon="account-tie-outline"
          onPress={() => navigation.navigate("AdminOwners")}
        />
      </ScrollView>

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
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
          icon="logout"
          onPress={() => void logout()}
        >
          Sair
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  title: { fontWeight: "600" },
  pendingCard: { borderRadius: 16 },
  pendingCardContent: { gap: 12 },
  pendingTextWrap: { gap: 4 },
  pendingHint: { opacity: 0.9 },
  grid: { flexDirection: "row", gap: 12 },
  cell: { flex: 1 },
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
