import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  Text,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  effectiveHighlightTier,
  highlightTierLabel,
} from "../../constants/highlightTier";
import { vehicleTypeLabel } from "../../constants/vehicleType";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import {
  type ContractTime,
  formatDateDisplay,
  formatMoneyWithContractPeriod,
  maskCpfCnpj,
  maskPhone,
  onlyDigits,
} from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "AdminOwnerDetail">;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="labelLarge" style={styles.fieldLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

function openEmail(email: string | null | undefined) {
  const to = email?.trim();
  if (!to) return;
  void Linking.openURL(`mailto:${encodeURIComponent(to)}`);
}

function openWhatsApp(phone: string | null | undefined) {
  const digits = onlyDigits(phone ?? "");
  if (digits.length < 10) return;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  void Linking.openURL(`https://wa.me/${withCountry}`);
}

export function AdminOwnerDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { ownerUserId } = route.params;

  const detailQ = trpc.admin.owners.getDetail.useQuery(
    { ownerUserId },
    { enabled: user?.role === "ADMIN" }
  );

  if (detailQ.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (detailQ.isError || !detailQ.data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {trpcErrorMessage(detailQ.error, "Locador não encontrado.")}
        </Text>
      </View>
    );
  }

  const data = detailQ.data;
  const p = data.profile;
  const contactEmail = p?.emailLocador?.trim() || data.accountEmail;
  const addressLine1 = p
    ? `${p.logradouro}, ${p.numero}${
        p.complemento?.trim() ? ` — ${p.complemento.trim()}` : ""
      }`
    : "—";
  const addressLine2 = p
    ? `${p.bairro} — ${p.cidade}/${p.uf} — CEP ${p.cep}`
    : "—";

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 8 + insets.bottom },
        ]}
      >
        {!data.profileComplete ? (
          <Card
            mode="elevated"
            style={[
              styles.card,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <Card.Content style={styles.gap}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSecondaryContainer }}
              >
                Pendências no perfil
              </Text>
              <View style={styles.chips}>
                {data.profileIssues.map((issue) => (
                  <Chip key={issue} compact mode="outlined">
                    {issue}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <Card mode="elevated" style={styles.card}>
          <Card.Title title="Perfil do locador" />
          <Card.Content style={styles.gap}>
            <Field
              label="Nome / Razão Social"
              value={p?.nomeRazaoSocial?.trim() || "—"}
            />
            <Field label="E-mail da conta" value={data.accountEmail} />
            <Field label="E-mail do locador" value={p?.emailLocador?.trim() || "—"} />
            <Field
              label="Modelo de contrato"
              value={
                p?.contractTemplateText?.trim()
                  ? "Customizado"
                  : "Modelo padrão do app"
              }
            />
            <Field
              label="CPF/CNPJ"
              value={p?.cpfCnpj ? maskCpfCnpj(p.cpfCnpj) : "—"}
            />
            <Field
              label="Telefone / WhatsApp"
              value={p?.phone ? maskPhone(p.phone) : "—"}
            />
            <Field label="Logradouro" value={addressLine1} />
            <Field label="Cidade / UF / CEP" value={addressLine2} />
            {p && p.ratingCount > 0 ? (
              <Field
                label="Avaliações"
                value={`★ ${p.averageRating.toFixed(1).replace(".", ",")} (${p.ratingCount})`}
              />
            ) : null}
            <Field
              label="Cadastro"
              value={formatDateDisplay(data.createdAt)}
            />
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            icon="email-outline"
            onPress={() => openEmail(contactEmail)}
            disabled={!contactEmail}
          >
            E-mail
          </Button>
          <Button
            mode="outlined"
            icon="whatsapp"
            onPress={() => openWhatsApp(p?.phone)}
            disabled={!p?.phone?.replace(/\D/g, "")}
          >
            WhatsApp
          </Button>
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Veículos ({data.vehicleCount})
        </Text>

        {data.vehicles.length === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
            Nenhum veículo cadastrado.
          </Text>
        ) : (
          data.vehicles.map((v) => {
            const tier = effectiveHighlightTier({
              highlightTier: v.highlightTier,
              highlightExpiresAt: v.highlightExpiresAt,
            });
            return (
              <Pressable
                key={v.id}
                onPress={() =>
                  navigation.navigate("AdminOwnerVehicleDetail", {
                    vehicleId: v.id,
                  })
                }
              >
                <Card mode="elevated" style={styles.card}>
                  <View style={styles.vehicleRow}>
                    {v.thumbUrl ? (
                      <Image source={{ uri: v.thumbUrl }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPh]}>
                        <Text variant="labelSmall" style={styles.thumbPhT}>
                          Sem foto
                        </Text>
                      </View>
                    )}
                    <View style={styles.vehicleBody}>
                      <Text variant="titleMedium">{v.title}</Text>
                      <Text variant="bodySmall" style={styles.meta}>
                        {v.plate} ·{" "}
                        {formatMoneyWithContractPeriod(
                          v.dailyRateCents,
                          v.contractTime as ContractTime
                        )}
                      </Text>
                      <Text variant="bodySmall" style={styles.meta}>
                        {vehicleTypeLabel(v.vehicleType)} ·{" "}
                        {v.available ? "Disponível" : "Indisponível"}
                        {tier !== "NORMAL" ? ` · ${highlightTierLabel(tier)}` : ""}
                      </Text>
                      <Text variant="bodySmall" style={styles.meta}>
                        {v.photoCount} foto{v.photoCount === 1 ? "" : "s"}
                        {v.activeRentalsCount > 0
                          ? ` · ${v.activeRentalsCount} locação ativa`
                          : ""}
                      </Text>
                      <Text variant="labelSmall" style={styles.tapHint}>
                        Toque para ver detalhes
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })
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
  container: { padding: 16, gap: 12 },
  card: { borderRadius: 16 },
  gap: { gap: 12 },
  field: { gap: 4 },
  fieldLabel: { opacity: 0.85, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { flexDirection: "row", gap: 12 },
  sectionTitle: { fontWeight: "600", marginTop: 4 },
  empty: { opacity: 0.75 },
  vehicleRow: { flexDirection: "row" },
  thumb: { width: 96, height: 96, backgroundColor: "#f1f5f9" },
  thumbPh: { justifyContent: "center", alignItems: "center" },
  thumbPhT: { fontSize: 11, color: "#94a3b8" },
  vehicleBody: { flex: 1, padding: 12, justifyContent: "center", gap: 2 },
  meta: { opacity: 0.85 },
  tapHint: { opacity: 0.65, marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
