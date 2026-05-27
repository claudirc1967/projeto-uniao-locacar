import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdSlot } from "../../components/ads/AdSlot";
import { AD_PLACEMENTS, MARKETPLACE_AD_EVERY_N } from "../../constants/adPlacements";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Marketplace">;

const UFS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "AC", label: "AC — Acre" },
  { value: "AL", label: "AL — Alagoas" },
  { value: "AP", label: "AP — Amapá" },
  { value: "AM", label: "AM — Amazonas" },
  { value: "BA", label: "BA — Bahia" },
  { value: "CE", label: "CE — Ceará" },
  { value: "DF", label: "DF — Distrito Federal" },
  { value: "ES", label: "ES — Espírito Santo" },
  { value: "GO", label: "GO — Goiás" },
  { value: "MA", label: "MA — Maranhão" },
  { value: "MT", label: "MT — Mato Grosso" },
  { value: "MS", label: "MS — Mato Grosso do Sul" },
  { value: "MG", label: "MG — Minas Gerais" },
  { value: "PA", label: "PA — Pará" },
  { value: "PB", label: "PB — Paraíba" },
  { value: "PR", label: "PR — Paraná" },
  { value: "PE", label: "PE — Pernambuco" },
  { value: "PI", label: "PI — Piauí" },
  { value: "RJ", label: "RJ — Rio de Janeiro" },
  { value: "RN", label: "RN — Rio Grande do Norte" },
  { value: "RS", label: "RS — Rio Grande do Sul" },
  { value: "RO", label: "RO — Rondônia" },
  { value: "RR", label: "RR — Roraima" },
  { value: "SC", label: "SC — Santa Catarina" },
  { value: "SP", label: "SP — São Paulo" },
  { value: "SE", label: "SE — Sergipe" },
  { value: "TO", label: "TO — Tocantins" },
];

type MarketplaceListFilters = {
  brandContains?: string;
  modelContains?: string;
  corContains?: string;
  pickupUf?: string;
  pickupCityContains?: string;
  ownerNameContains?: string;
  ownerUserId?: string;
  yearMin?: number;
  yearMax?: number;
  portas?: number;
  lugares?: number;
  contractTime?: "DIARIO" | "SEMANAL" | "MENSAL";
  priceMinCents?: number;
  priceMaxCents?: number;
  /** Média mínima do locador (1–5), conforme avaliações de locatários. */
  ownerMinAverageStars?: number;
};

const OWNER_MIN_STARS_OPTIONS = ["ANY", "1", "2", "3", "4", "5"] as const;
type OwnerMinStarsOption = (typeof OWNER_MIN_STARS_OPTIONS)[number];

type FilterDraft = {
  ownerMinStars: OwnerMinStarsOption;
  brand: string;
  model: string;
  cor: string;
  pickupUf: string;
  pickupCity: string;
  ownerName: string;
  yearMin: string;
  yearMax: string;
  portas: string;
  lugares: string;
  contractTime: "ANY" | "DIARIO" | "SEMANAL" | "MENSAL";
  priceMin: string;
  priceMax: string;
};

function emptyDraft(): FilterDraft {
  return {
    ownerMinStars: "ANY",
    brand: "",
    model: "",
    cor: "",
    pickupUf: "",
    pickupCity: "",
    ownerName: "",
    yearMin: "",
    yearMax: "",
    portas: "",
    lugares: "",
    contractTime: "ANY",
    priceMin: "",
    priceMax: "",
  };
}

function draftFromApplied(a: MarketplaceListFilters): FilterDraft {
  const minStars = a.ownerMinAverageStars;
  const ownerMinStars: OwnerMinStarsOption =
    minStars === 1 ||
    minStars === 2 ||
    minStars === 3 ||
    minStars === 4 ||
    minStars === 5
      ? (`${minStars}` as OwnerMinStarsOption)
      : "ANY";
  return {
    ownerMinStars,
    brand: a.brandContains ?? "",
    model: a.modelContains ?? "",
    cor: a.corContains ?? "",
    pickupUf: a.pickupUf ?? "",
    pickupCity: a.pickupCityContains ?? "",
    ownerName: a.ownerNameContains ?? "",
    yearMin: a.yearMin != null ? String(a.yearMin) : "",
    yearMax: a.yearMax != null ? String(a.yearMax) : "",
    portas: a.portas != null ? String(a.portas) : "",
    lugares: a.lugares != null ? String(a.lugares) : "",
    contractTime: a.contractTime ?? "ANY",
    priceMin:
      a.priceMinCents != null ? (a.priceMinCents / 100).toFixed(2) : "",
    priceMax:
      a.priceMaxCents != null ? (a.priceMaxCents / 100).toFixed(2) : "",
  };
}

/** Aceita "12,50" ou "12.50"; retorna centavos ou undefined se vazio/ inválido. */
function parseReaisToCents(s: string): number | undefined {
  const raw = s.trim();
  if (!raw) return undefined;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function buildFilters(d: FilterDraft): {
  filters: MarketplaceListFilters;
  error: string | null;
} {
  const o: MarketplaceListFilters = {};
  if (d.ownerMinStars !== "ANY") {
    o.ownerMinAverageStars = Number.parseInt(d.ownerMinStars, 10);
  }
  if (d.brand.trim()) o.brandContains = d.brand.trim();
  if (d.model.trim()) o.modelContains = d.model.trim();
  if (d.cor.trim()) o.corContains = d.cor.trim();

  if (d.pickupUf.trim()) {
    const uf = d.pickupUf.trim().toUpperCase();
    if (uf.length !== 2) {
      return { filters: {}, error: "UF inválida (use 2 letras, ex.: SP)." };
    }
    o.pickupUf = uf;
  }
  if (d.pickupCity.trim()) o.pickupCityContains = d.pickupCity.trim();
  if (d.ownerName.trim()) o.ownerNameContains = d.ownerName.trim();

  if (d.yearMin.trim()) {
    const n = parseInt(d.yearMin.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n < 1900 || n > 2100) {
      return { filters: {}, error: "Ano mínimo inválido (1900–2100)." };
    }
    o.yearMin = n;
  }
  if (d.yearMax.trim()) {
    const n = parseInt(d.yearMax.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n < 1900 || n > 2100) {
      return { filters: {}, error: "Ano máximo inválido (1900–2100)." };
    }
    o.yearMax = n;
  }
  if (
    o.yearMin != null &&
    o.yearMax != null &&
    o.yearMin > o.yearMax
  ) {
    return {
      filters: {},
      error: "Ano mínimo não pode ser maior que o ano máximo.",
    };
  }

  if (d.portas.trim()) {
    const n = parseInt(d.portas.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n < 2 || n > 8) {
      return { filters: {}, error: "Portas: informe um número entre 2 e 8." };
    }
    o.portas = n;
  }
  if (d.lugares.trim()) {
    const n = parseInt(d.lugares.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n < 1 || n > 15) {
      return { filters: {}, error: "Lugares: informe um número entre 1 e 15." };
    }
    o.lugares = n;
  }

  if (d.contractTime !== "ANY") {
    o.contractTime = d.contractTime;
  }

  const minC = parseReaisToCents(d.priceMin);
  const maxC = parseReaisToCents(d.priceMax);
  if (d.priceMin.trim() && minC === undefined) {
    return { filters: {}, error: "Valor mínimo (R$) inválido." };
  }
  if (d.priceMax.trim() && maxC === undefined) {
    return { filters: {}, error: "Valor máximo (R$) inválido." };
  }
  if (minC != null) o.priceMinCents = minC;
  if (maxC != null) o.priceMaxCents = maxC;
  if (
    o.priceMinCents != null &&
    o.priceMaxCents != null &&
    o.priceMinCents > o.priceMaxCents
  ) {
    return {
      filters: {},
      error: "Valor mínimo não pode ser maior que o valor máximo.",
    };
  }

  return { filters: o, error: null };
}

export function MarketplaceScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [applied, setApplied] = useState<MarketplaceListFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [ufPickerOpen, setUfPickerOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(emptyDraft);
  const [modalErr, setModalErr] = useState<string | null>(null);

  const queryFilters = useMemo(() => {
    if (user?.role === "OWNER") {
      const { ownerMinAverageStars: _stars, ...rest } = applied;
      return { ...rest, ownerUserId: user.id };
    }
    return applied;
  }, [applied, user]);

  const q = trpc.marketplace.listAvailableVehicles.useQuery(queryFilters);

  const activeCount = useMemo(() => {
    const a = { ...applied };
    if (user?.role === "OWNER") {
      delete a.ownerMinAverageStars;
    }
    return Object.keys(a).length;
  }, [applied, user]);

  const applyFilters = () => {
    const { filters, error } = buildFilters(draft);
    if (error) {
      setModalErr(error);
      return;
    }
    if (user?.role === "OWNER" && filters.ownerMinAverageStars != null) {
      const { ownerMinAverageStars: _o, ...rest } = filters;
      setApplied(rest);
    } else {
      setApplied(filters);
    }
    setModalErr(null);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setApplied({});
    setDraft(emptyDraft());
    setModalErr(null);
    setFilterOpen(false);
  };

  const openFilters = () => {
    let d = draftFromApplied(applied);
    if (user?.role === "OWNER") {
      d = { ...d, ownerMinStars: "ANY" };
    }
    setDraft(d);
    setModalErr(null);
    setFilterOpen(true);
  };

  if (q.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, textAlign: "center" }}>
          {trpcErrorMessage(q.error)}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <FlatList
          data={q.data ?? []}
          keyExtractor={(i) => i.id}
          style={{ backgroundColor: theme.colors.background }}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 8 + insets.bottom },
          ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Button
                mode="outlined"
                icon="filter-variant"
                onPress={openFilters}
                style={styles.filterButton}
              >
                Filtrar veículos
              </Button>
            </View>
            {activeCount > 0 ? (
              <Text variant="labelMedium" style={styles.filterHint}>
                {activeCount} filtro(s) ativo(s)
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            {activeCount > 0
              ? "Nenhum veículo encontrado com os filtros atuais."
              : "Nenhum veículo listado."}
          </Text>
        }
        renderItem={({ item, index }) => (
          <>
            <Pressable
              onPress={() =>
                navigation.navigate("VehicleDetail", { vehicleId: item.id })
              }
            >
              <Card mode="elevated" style={styles.card}>
                <View style={styles.cardClip}>
                <View style={styles.row}>
                {item.coverPhotoUrl ? (
                  <Image source={{ uri: item.coverPhotoUrl }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.ph]}>
                    <Text variant="labelSmall" style={styles.phT}>
                      Sem foto
                    </Text>
                  </View>
                )}
                <View style={styles.body}>
                  <Text variant="titleMedium">{item.title}</Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    {formatMoneyWithContractPeriod(
                      item.dailyRateCents,
                      item.contractTime
                    )}
                  </Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    Modelo: {item.model ?? "—"}
                  </Text>
                  <View style={styles.rowYearCor}>
                    <Text variant="bodySmall" style={[styles.meta, styles.metaPairLine]}>
                      Ano: {item.year}
                    </Text>
                    <Text variant="bodySmall" style={[styles.meta, styles.metaPairLine]}>
                      Cor: {item.cor ?? "—"}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.meta}>
                    Portas: {item.portas ?? 4} · Lugares: {item.lugares ?? 5}
                  </Text>
                  {item.pickupCity ? (
                    <Text variant="bodySmall" style={styles.meta}>
                      {item.pickupCity}
                      {item.pickupUf ? `/${item.pickupUf}` : ""}
                    </Text>
                  ) : null}
                  {user?.role === "DRIVER" ? (
                    <Text variant="bodySmall" style={styles.locadorBold}>
                      Locador: {item.ownerName ?? "—"}
                    </Text>
                  ) : null}
                  {user?.role === "DRIVER" ? (
                    <Text variant="bodySmall" style={styles.ownerRatingLine}>
                      {item.ownerRatingCount > 0 && item.ownerAverageRating != null
                        ? `★ ${item.ownerAverageRating.toFixed(1).replace(".", ",")} (${item.ownerRatingCount})`
                        : "Sem avaliações"}
                    </Text>
                  ) : null}
                  {user?.role === "DRIVER" && item.driverRequestBlocked ? (
                    <Text variant="labelSmall" style={styles.blockedTag}>
                      Solicitação bloqueada
                    </Text>
                  ) : null}
                </View>
              </View>
              </View>
            </Card>
          </Pressable>
            {user?.role === "DRIVER" &&
            (index + 1) % MARKETPLACE_AD_EVERY_N === 0 ? (
              <AdSlot placement={AD_PLACEMENTS.MARKETPLACE_LIST} />
            ) : null}
          </>
        )}
        />
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
            Voltar
          </Button>
        </View>
      </View>

      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterOpen(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="titleLarge" style={styles.modalTitle}>
              Filtrar veículos
            </Text>
            <Text variant="bodySmall" style={styles.modalSub}>
              Preencha só o que quiser; todos os critérios informados são
              aplicados em conjunto.
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.modalScroll}
            >
              {user?.role !== "OWNER" ? (
                <>
                  <Text variant="labelLarge" style={styles.sectionLabel}>
                    Avaliação mínima do locador
                  </Text>
                  <Text variant="bodySmall" style={styles.starsFilterHint}>
                    Média das avaliações recebidas pelo proprietário (de
                    locatários). Só entram locadores com pelo menos uma
                    avaliação.
                  </Text>
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={styles.ownerStarsScroll}
                    contentContainerStyle={styles.ownerStarsChipsRow}
                  >
                    {OWNER_MIN_STARS_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        compact
                        selected={draft.ownerMinStars === opt}
                        onPress={() =>
                          setDraft((prev) => ({ ...prev, ownerMinStars: opt }))
                        }
                        style={styles.ownerStarChip}
                        mode="outlined"
                      >
                        {opt === "ANY" ? "Qualquer" : `${opt}+ ★`}
                      </Chip>
                    ))}
                  </ScrollView>
                </>
              ) : null}
              <View
                style={[
                  styles.rowFields,
                  user?.role === "OWNER" ? styles.rowFieldsFirst : null,
                ]}
              >
                <Pressable
                  onPress={() => setUfPickerOpen(true)}
                  style={styles.fieldHalf}
                >
                  <TextInput
                    label="UF (retirada)"
                    value={draft.pickupUf || "Qualquer"}
                    mode="outlined"
                    editable={false}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="chevron-down" />}
                    style={styles.field}
                  />
                </Pressable>
                <TextInput
                  label="Cidade (retirada)"
                  value={draft.pickupCity}
                  onChangeText={(t) =>
                    setDraft((d) => ({ ...d, pickupCity: t }))
                  }
                  mode="outlined"
                  style={[styles.field, styles.fieldHalf]}
                />
              </View>
              {user?.role !== "OWNER" ? (
                <TextInput
                  label="Locador (contém)"
                  value={draft.ownerName}
                  onChangeText={(t) =>
                    setDraft((d) => ({ ...d, ownerName: t }))
                  }
                  mode="outlined"
                  style={styles.field}
                />
              ) : null}
              <TextInput
                label="Marca (contém)"
                value={draft.brand}
                onChangeText={(t) => setDraft((d) => ({ ...d, brand: t }))}
                mode="outlined"
                style={styles.field}
              />
              <TextInput
                label="Modelo (contém)"
                value={draft.model}
                onChangeText={(t) => setDraft((d) => ({ ...d, model: t }))}
                mode="outlined"
                style={styles.field}
              />
              <TextInput
                label="Cor (contém)"
                value={draft.cor}
                onChangeText={(t) => setDraft((d) => ({ ...d, cor: t }))}
                mode="outlined"
                style={styles.field}
              />
              <View style={styles.rowFields}>
                <TextInput
                  label="Ano mín."
                  value={draft.yearMin}
                  onChangeText={(t) => setDraft((d) => ({ ...d, yearMin: t }))}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={[styles.field, styles.fieldHalf]}
                />
                <TextInput
                  label="Ano máx."
                  value={draft.yearMax}
                  onChangeText={(t) => setDraft((d) => ({ ...d, yearMax: t }))}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={[styles.field, styles.fieldHalf]}
                />
              </View>
              <View style={styles.rowFields}>
                <TextInput
                  label="Portas"
                  value={draft.portas}
                  onChangeText={(t) => setDraft((d) => ({ ...d, portas: t }))}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={[styles.field, styles.fieldHalf]}
                />
                <TextInput
                  label="Lugares"
                  value={draft.lugares}
                  onChangeText={(t) => setDraft((d) => ({ ...d, lugares: t }))}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={[styles.field, styles.fieldHalf]}
                />
              </View>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Período de cobrança
              </Text>
              <SegmentedButtons
                value={draft.contractTime}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    contractTime: v as FilterDraft["contractTime"],
                  }))
                }
                buttons={[
                  { value: "ANY", label: "Qualquer" },
                  { value: "DIARIO", label: "Diário" },
                  { value: "SEMANAL", label: "Semanal" },
                  { value: "MENSAL", label: "Mensal" },
                ]}
                style={styles.segment}
              />
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Valor no período (R$)
              </Text>
              <View style={styles.rowFields}>
                <TextInput
                  label="Mín."
                  value={draft.priceMin}
                  onChangeText={(t) => setDraft((d) => ({ ...d, priceMin: t }))}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={[styles.field, styles.fieldHalf]}
                />
                <TextInput
                  label="Máx."
                  value={draft.priceMax}
                  onChangeText={(t) => setDraft((d) => ({ ...d, priceMax: t }))}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={[styles.field, styles.fieldHalf]}
                />
              </View>
              {modalErr ? (
                <Text style={[styles.modalErr, { color: theme.colors.error }]}>
                  {modalErr}
                </Text>
              ) : null}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={clearFilters} style={styles.btn}>
                Limpar
              </Button>
              <Button mode="contained" onPress={applyFilters} style={styles.btn}>
                Aplicar
              </Button>
            </View>
            <Button mode="text" onPress={() => setFilterOpen(false)}>
              Fechar
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={ufPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setUfPickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setUfPickerOpen(false)}
        >
          <Pressable
            style={[
              styles.ufSheet,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="titleMedium" style={styles.ufTitle}>
              Selecione a UF
            </Text>
            <FlatList
              data={[{ value: "", label: "Qualquer UF" }, ...UFS]}
              keyExtractor={(i) => i.value || "ANY"}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setDraft((d) => ({ ...d, pickupUf: item.value }));
                    setUfPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.ufItem,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text variant="bodyMedium">{item.label}</Text>
                  {draft.pickupUf === item.value ? (
                    <Text variant="labelMedium" style={styles.ufSelected}>
                      Selecionado
                    </Text>
                  ) : null}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.ufSep} />}
              style={{ maxHeight: 420 }}
            />
            <Button mode="text" onPress={() => setUfPickerOpen(false)}>
              Fechar
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, paddingBottom: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  headerBlock: { marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  filterButton: { alignSelf: "flex-start" },
  headerTitle: { flex: 1 },
  filterHint: { marginTop: 4, opacity: 0.75 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardClip: { borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row" },
  cover: { width: 110, height: 110, backgroundColor: "#f1f5f9" },
  ph: { justifyContent: "center", alignItems: "center" },
  phT: { color: "#94a3b8" },
  body: { flex: 1, padding: 12, justifyContent: "center" },
  meta: { marginTop: 4, opacity: 0.85 },
  rowYearCor: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
    alignItems: "flex-start",
  },
  metaPairLine: { marginTop: 0, opacity: 0.85 },
  locadorBold: {
    marginTop: 4,
    fontWeight: "700",
    opacity: 1,
  },
  ownerRatingLine: {
    marginTop: 2,
    opacity: 0.9,
  },
  empty: { marginTop: 24, opacity: 0.7 },
  blockedTag: {
    marginTop: 8,
    fontWeight: "600",
    color: "#b45309",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 28,
  },
  ufSheet: {
    width: "92%",
    maxWidth: 520,
    alignSelf: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  ufTitle: { marginBottom: 10 },
  ufItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ufSelected: { opacity: 0.7 },
  ufSep: { height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0" },
  modalTitle: { marginBottom: 4 },
  modalSub: { opacity: 0.75, marginBottom: 12 },
  modalScroll: { maxHeight: 420 },
  field: { marginBottom: 10 },
  rowFields: { flexDirection: "row", gap: 8 },
  /** Espaço após o texto introdutório quando o bloco de estrelas está oculto (proprietário). */
  rowFieldsFirst: { marginTop: 4 },
  fieldHalf: { flex: 1 },
  sectionLabel: { marginTop: 8, marginBottom: 6 },
  starsFilterHint: { opacity: 0.8, marginBottom: 10, lineHeight: 18 },
  ownerStarsScroll: {
    marginBottom: 16,
  },
  ownerStarsChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 12,
    flexGrow: 1,
  },
  ownerStarChip: { marginRight: 0 },
  segment: { marginBottom: 12 },
  modalErr: { marginBottom: 8 },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  btn: { flex: 1 },
});
