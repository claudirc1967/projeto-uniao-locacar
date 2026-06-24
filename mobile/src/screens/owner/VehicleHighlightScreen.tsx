import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Button,
  Card,
  Chip,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  effectiveHighlightTier,
  highlightTierLabel,
  type VehicleHighlightTier,
} from "../../constants/highlightTier";
import type { RootStackParamList } from "../../navigation/types";
import {
  formatDateDisplay,
  formatMoneyFromCents,
} from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleHighlight">;

type PaidTier = Exclude<VehicleHighlightTier, "NORMAL">;

const TIER_ORDER: PaidTier[] = ["OURO", "PRATA", "BRONZE"];

export function VehicleHighlightScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const [snack, setSnack] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<PaidTier | null>(null);

  const vehicleQ = trpc.owner.getMyVehicle.useQuery({ vehicleId });
  const plansQ = trpc.highlights.owner.getPlans.useQuery();
  const pendingQ = trpc.highlights.owner.getPendingOrderForVehicle.useQuery({
    vehicleId,
  });

  const createM = trpc.highlights.owner.createOrder.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.highlights.owner.getPendingOrderForVehicle.invalidate({
          vehicleId,
        }),
        utils.highlights.owner.listMyOrders.invalidate(),
        utils.owner.listMyVehicles.invalidate(),
      ]);
    },
  });

  const payment = pendingQ.data?.pending ?? createM.data ?? null;

  const sortedPlans = useMemo(() => {
    const plans = plansQ.data ?? [];
    return TIER_ORDER.map(
      (tier) => plans.find((p) => p.tier === tier) ?? null
    ).filter(Boolean) as NonNullable<(typeof plans)[number]>[];
  }, [plansQ.data]);

  const onSelectTier = useCallback((tier: PaidTier) => {
    setSelectedTier(tier);
  }, []);

  const onCreateOrder = useCallback(() => {
    if (!selectedTier) return;
    createM.mutate({ vehicleId, tier: selectedTier });
  }, [createM, selectedTier, vehicleId]);

  const copyPixKey = useCallback(async () => {
    if (!payment?.pixKey) return;
    await Clipboard.setStringAsync(payment.pixKey);
    setSnack("Chave PIX copiada.");
  }, [payment?.pixKey]);

  const copyReference = useCallback(async () => {
    if (!payment?.orderReference) return;
    await Clipboard.setStringAsync(payment.orderReference);
    setSnack("Código do pedido copiado.");
  }, [payment?.orderReference]);

  if (vehicleQ.isLoading || plansQ.isLoading || pendingQ.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (vehicleQ.isError || plansQ.isError || pendingQ.isError) {
    const err = vehicleQ.error ?? plansQ.error ?? pendingQ.error;
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 12, textAlign: "center" }}>
          {trpcErrorMessage(err)}
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    );
  }

  const vehicle = vehicleQ.data;
  const currentTier = effectiveHighlightTier(vehicle);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
      >
        <Text variant="titleLarge" style={styles.title}>
          Destaque no marketplace
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {vehicle.title} · {vehicle.plate}
        </Text>

        {payment ? (
          <Card mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardGap}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Pagamento PIX
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Após pagar, aguarde a confirmação da plataforma. O destaque{" "}
                {highlightTierLabel(payment.tier as VehicleHighlightTier)} ficará
                ativo por {payment.durationDaysSnapshot} dias.
              </Text>

              <View style={styles.amountBox}>
                <Text variant="labelLarge">Valor</Text>
                <Text variant="headlineSmall" style={styles.amount}>
                  {formatMoneyFromCents(payment.amountCents)}
                </Text>
              </View>

              <View style={styles.refRow}>
                <Text variant="bodyMedium">
                  Pedido: <Text style={styles.bold}>{payment.orderReference}</Text>
                </Text>
                <Button compact mode="text" onPress={() => void copyReference()}>
                  Copiar
                </Button>
              </View>

              {payment.receiverName ? (
                <Text variant="bodySmall" style={styles.muted}>
                  Recebedor: {payment.receiverName}
                </Text>
              ) : null}

              <View style={styles.refRow}>
                <Text variant="bodyMedium" style={styles.pixKey} numberOfLines={2}>
                  Chave PIX: {payment.pixKey}
                </Text>
                <Button compact mode="text" onPress={() => void copyPixKey()}>
                  Copiar
                </Button>
              </View>

              <Text variant="bodySmall" style={[styles.muted, styles.qrHint]}>
                Use a chave PIX acima no app do banco. Informe o código do
                pedido na descrição, se possível.
              </Text>
            </Card.Content>
          </Card>
        ) : sortedPlans.length === 0 ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium">
                Nenhum plano de destaque disponível no momento. A plataforma
                ainda está configurando preços e pagamento.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Escolha o plano
            </Text>
            {sortedPlans.map((plan) => (
              <Card
                key={plan.tier}
                mode="elevated"
                style={[
                  styles.planCard,
                  selectedTier === plan.tier && styles.planSelected,
                ]}
                onPress={() => onSelectTier(plan.tier as PaidTier)}
              >
                <Card.Content style={styles.planRow}>
                  <View style={styles.planText}>
                    <Text variant="titleMedium">
                      {highlightTierLabel(plan.tier as VehicleHighlightTier)}
                    </Text>
                    <Text variant="bodySmall" style={styles.muted}>
                      {plan.durationDays} dias de prioridade na listagem
                    </Text>
                    {plan.description ? (
                      <Text variant="bodySmall" style={styles.muted}>
                        {plan.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.planPrice}>
                    <Text variant="titleLarge" style={styles.price}>
                      {formatMoneyFromCents(plan.priceCents)}
                    </Text>
                    {selectedTier === plan.tier ? (
                      <Chip compact>Selecionado</Chip>
                    ) : null}
                  </View>
                </Card.Content>
              </Card>
            ))}

            {createM.isError ? (
              <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                {trpcErrorMessage(createM.error)}
              </Text>
            ) : null}

            <Button
              mode="contained"
              icon="lightning-bolt"
              onPress={onCreateOrder}
              disabled={!selectedTier || createM.isPending}
              loading={createM.isPending}
              style={styles.cta}
            >
              Gerar pedido PIX
            </Button>
          </>
        )}

        {currentTier !== "NORMAL" && vehicle.highlightExpiresAt ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.muted}>
                Destaque atual: {highlightTierLabel(currentTier)} até{" "}
                {formatDateDisplay(vehicle.highlightExpiresAt)}
              </Text>
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>

      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  scroll: { padding: 16, gap: 12 },
  title: { fontWeight: "600" },
  sectionTitle: { fontWeight: "600", marginTop: 8 },
  card: { borderRadius: 16 },
  cardGap: { gap: 10 },
  muted: { opacity: 0.85 },
  planCard: { borderRadius: 16 },
  planSelected: { borderWidth: 2, borderColor: "#f97316" },
  planRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  planText: { flex: 1, gap: 4 },
  planPrice: { alignItems: "flex-end", gap: 6 },
  price: { fontWeight: "700", color: "#f97316" },
  cta: { marginTop: 8 },
  amountBox: { marginTop: 8, gap: 4 },
  amount: { fontWeight: "700" },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bold: { fontWeight: "600" },
  pixKey: { flex: 1 },
  qrHint: { textAlign: "center" },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
