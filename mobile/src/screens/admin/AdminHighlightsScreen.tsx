import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  highlightTierLabel,
  PAID_HIGHLIGHT_TIERS,
  type VehicleHighlightTier,
} from "../../constants/highlightTier";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import {
  formatMoneyFromCents,
  maskMoneyInput,
  moneyInputFromCents,
  parseMoneyInputToCents,
} from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminHighlights">;

type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

const PIX_KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefone" },
  { value: "RANDOM", label: "Aleatória" },
];

type PlanDraft = {
  priceInput: string;
  durationDays: string;
  active: boolean;
  description: string;
};

function emptyPlanDraft(): PlanDraft {
  return { priceInput: "", durationDays: "30", active: false, description: "" };
}

export function AdminHighlightsScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const plansQ = trpc.highlights.admin.getPlans.useQuery(undefined, {
    enabled: user?.role === "ADMIN",
  });
  const pixQ = trpc.highlights.admin.getPixConfig.useQuery(undefined, {
    enabled: user?.role === "ADMIN",
  });
  const ordersQ = trpc.highlights.admin.listOrders.useQuery(
    { status: "PENDING_PIX" },
    { enabled: user?.role === "ADMIN" }
  );

  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanDraft>>({});
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("RANDOM");
  const [receiverName, setReceiverName] = useState("");

  useEffect(() => {
    if (!plansQ.data) return;
    const next: Record<string, PlanDraft> = {};
    for (const tier of PAID_HIGHLIGHT_TIERS) {
      const plan = plansQ.data.find((p) => p.tier === tier);
      next[tier] = plan
        ? {
            priceInput: moneyInputFromCents(plan.priceCents),
            durationDays: String(plan.durationDays),
            active: plan.active,
            description: plan.description ?? "",
          }
        : emptyPlanDraft();
    }
    setPlanDrafts(next);
  }, [plansQ.data]);

  useEffect(() => {
    if (!pixQ.data) return;
    setPixKey(pixQ.data.pixKey);
    setPixKeyType(pixQ.data.pixKeyType as PixKeyType);
    setReceiverName(pixQ.data.receiverName);
  }, [pixQ.data]);

  const upsertPlanM = trpc.highlights.admin.upsertPlan.useMutation({
    onSuccess: async () => {
      await plansQ.refetch();
    },
  });

  const upsertPixM = trpc.highlights.admin.upsertPixConfig.useMutation({
    onSuccess: async () => {
      await pixQ.refetch();
    },
  });

  const confirmM = trpc.highlights.admin.confirmPayment.useMutation({
    onSuccess: async () => {
      await ordersQ.refetch();
    },
  });

  const rejectM = trpc.highlights.admin.rejectPayment.useMutation({
    onSuccess: async () => {
      await ordersQ.refetch();
    },
  });

  const onRefresh = useCallback(() => {
    void plansQ.refetch();
    void pixQ.refetch();
    void ordersQ.refetch();
  }, [plansQ, pixQ, ordersQ]);

  const savePlan = (tier: VehicleHighlightTier) => {
    const draft = planDrafts[tier] ?? emptyPlanDraft();
    const durationDays = parseInt(draft.durationDays, 10);
    if (!Number.isFinite(durationDays) || durationDays < 1) return;

    upsertPlanM.mutate({
      tier: tier as "BRONZE" | "PRATA" | "OURO",
      priceCents: parseMoneyInputToCents(draft.priceInput),
      durationDays,
      active: draft.active,
      description: draft.description.trim() || null,
    });
  };

  const savePix = () => {
    upsertPixM.mutate({
      pixKey: pixKey.trim(),
      pixKeyType,
      receiverName: receiverName.trim(),
    });
  };

  const loading = plansQ.isLoading || pixQ.isLoading;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (plansQ.isError || pixQ.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 12, textAlign: "center" }}>
          {trpcErrorMessage(plansQ.error ?? pixQ.error)}
        </Text>
        <Button mode="contained" onPress={onRefresh}>
          Tentar de novo
        </Button>
      </View>
    );
  }

  const orders = ordersQ.data ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: 8 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={plansQ.isFetching || pixQ.isFetching || ordersQ.isFetching}
            onRefresh={onRefresh}
          />
        }
      >
      <Text variant="headlineSmall" style={styles.title}>
        Destaques
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Configure planos, PIX e confirme pagamentos dos locadores.
      </Text>

      <Text variant="titleMedium" style={styles.section}>
        Planos
      </Text>
      {PAID_HIGHLIGHT_TIERS.map((tier) => {
        const draft = planDrafts[tier] ?? emptyPlanDraft();
        return (
          <Card key={tier} mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardGap}>
              <Text variant="titleMedium">{highlightTierLabel(tier)}</Text>
              <TextInput
                mode="outlined"
                label="Preço (R$)"
                value={draft.priceInput}
                onChangeText={(t) =>
                  setPlanDrafts((prev) => ({
                    ...prev,
                    [tier]: { ...draft, priceInput: maskMoneyInput(t) },
                  }))
                }
                keyboardType="numeric"
                dense
              />
              <TextInput
                mode="outlined"
                label="Duração (dias)"
                value={draft.durationDays}
                onChangeText={(t) =>
                  setPlanDrafts((prev) => ({
                    ...prev,
                    [tier]: { ...draft, durationDays: t.replace(/\D/g, "") },
                  }))
                }
                keyboardType="number-pad"
                dense
              />
              <TextInput
                mode="outlined"
                label="Descrição (opcional)"
                value={draft.description}
                onChangeText={(t) =>
                  setPlanDrafts((prev) => ({
                    ...prev,
                    [tier]: { ...draft, description: t },
                  }))
                }
                dense
              />
              <View style={styles.switchRow}>
                <Text>Plano ativo para locadores</Text>
                <Switch
                  value={draft.active}
                  onValueChange={(v) =>
                    setPlanDrafts((prev) => ({
                      ...prev,
                      [tier]: { ...draft, active: v },
                    }))
                  }
                />
              </View>
              <Button
                mode="contained-tonal"
                onPress={() => savePlan(tier)}
                loading={upsertPlanM.isPending}
              >
                Salvar {highlightTierLabel(tier)}
              </Button>
            </Card.Content>
          </Card>
        );
      })}

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.section}>
        Chave PIX da plataforma
      </Text>
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardGap}>
          <TextInput
            mode="outlined"
            label="Chave PIX"
            value={pixKey}
            onChangeText={setPixKey}
            dense
          />
          <Text variant="labelLarge">Tipo da chave</Text>
          <View style={styles.chipRow}>
            {PIX_KEY_TYPES.map((opt) => (
              <Button
                key={opt.value}
                mode={pixKeyType === opt.value ? "contained" : "outlined"}
                compact
                onPress={() => setPixKeyType(opt.value)}
                style={styles.typeBtn}
              >
                {opt.label}
              </Button>
            ))}
          </View>
          <TextInput
            mode="outlined"
            label="Nome do recebedor"
            value={receiverName}
            onChangeText={setReceiverName}
            dense
          />
          <Button
            mode="contained"
            onPress={savePix}
            loading={upsertPixM.isPending}
          >
            Salvar PIX
          </Button>
          {upsertPixM.isError ? (
            <Text style={{ color: theme.colors.error }}>
              {trpcErrorMessage(upsertPixM.error)}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.section}>
        Pedidos aguardando PIX
      </Text>
      {ordersQ.isError ? (
        <Text style={{ color: theme.colors.error }}>
          {trpcErrorMessage(ordersQ.error)}
        </Text>
      ) : orders.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          Nenhum pedido pendente.
        </Text>
      ) : (
        orders.map((order) => (
          <Card key={order.id} mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardGap}>
              <Text variant="titleMedium">
                {order.vehicle.title} · {order.vehicle.plate}
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                {order.ownerName ?? order.ownerEmail}
              </Text>
              <Text variant="bodyMedium">
                {highlightTierLabel(order.tier as VehicleHighlightTier)} ·{" "}
                {formatMoneyFromCents(order.amountCents)} ·{" "}
                {order.durationDaysSnapshot} dias
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Pedido {order.orderReference}
              </Text>
              <View style={styles.orderActions}>
                <Button
                  mode="contained"
                  icon="check"
                  onPress={() => confirmM.mutate({ orderId: order.id })}
                  loading={confirmM.isPending}
                >
                  Confirmar pagamento
                </Button>
                <Button
                  mode="outlined"
                  textColor={theme.colors.error}
                  onPress={() => rejectM.mutate({ orderId: order.id })}
                  loading={rejectM.isPending}
                >
                  Rejeitar
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
      </ScrollView>
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
  scroll: { padding: 16, gap: 12 },
  title: { fontWeight: "600" },
  section: { fontWeight: "600", marginTop: 8 },
  card: { borderRadius: 16 },
  cardGap: { gap: 10 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { marginBottom: 4 },
  divider: { marginVertical: 8 },
  muted: { opacity: 0.85 },
  empty: { opacity: 0.8, textAlign: "center", marginTop: 8 },
  orderActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
