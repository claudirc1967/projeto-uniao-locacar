import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewToken,
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
import { HighlightTierBadge } from "../../components/HighlightTierBadge";
import { AD_PLACEMENTS, MARKETPLACE_AD_EVERY_N } from "../../constants/adPlacements";
import type { VehicleHighlightTier } from "../../constants/highlightTier";
import type { VehicleType } from "../../constants/vehicleType";
import {
  VEHICLE_COLORS,
  vehicleColorDisplayLabel,
} from "../../constants/vehicleColors";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { formatMoneyWithContractPeriod } from "../../utils/masks";
import { formatVehicleMetaLine } from "../../utils/vehicleDisplay";
import { createAdEventId } from "../../utils/adEventId";
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

const UF_MENU_ITEMS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Qualquer UF" },
  ...UFS,
];

function pickupUfDisplayLabel(uf: string): string {
  if (!uf.trim()) return "Qualquer";
  const found = UFS.find((x) => x.value === uf);
  return found?.label ?? uf;
}

const COLOR_MENU_ITEMS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Qualquer cor" },
  ...VEHICLE_COLORS.map((c) => ({ value: c.label, label: c.label })),
];

function pickupCorDisplayLabel(cor: string): string {
  if (!cor.trim()) return "Qualquer";
  return vehicleColorDisplayLabel(cor);
}

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
  vehicleType?: VehicleType;
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
  vehicleType: "ANY" | VehicleType;
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
    vehicleType: "ANY",
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
    vehicleType: a.vehicleType ?? "ANY",
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

  if (d.vehicleType !== "ANY") {
    o.vehicleType = d.vehicleType;
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
  const [ufPickerExpanded, setUfPickerExpanded] = useState(false);
  const [corPickerExpanded, setCorPickerExpanded] = useState(false);
  const [brandPickerExpanded, setBrandPickerExpanded] = useState(false);
  const [modelPickerExpanded, setModelPickerExpanded] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(emptyDraft);
  const [modalErr, setModalErr] = useState<string | null>(null);

  useEffect(() => {
    if (!filterOpen) {
      setUfPickerExpanded(false);
      setCorPickerExpanded(false);
      setBrandPickerExpanded(false);
      setModelPickerExpanded(false);
    }
  }, [filterOpen]);

  const brandsQ = trpc.marketplace.listVehicleBrands.useQuery(undefined, {
    enabled: filterOpen,
  });
  const modelsQ = trpc.marketplace.listVehicleModels.useQuery(
    {
      brandName: draft.brand,
      ...(draft.vehicleType !== "ANY"
        ? { vehicleType: draft.vehicleType }
        : {}),
    },
    { enabled: filterOpen && draft.brand.trim().length > 0 }
  );

  const brandMenuItems = useMemo(() => {
    const rows = (brandsQ.data ?? []).map((b) => ({
      value: b.name,
      label: b.name,
    }));
    return [{ value: "", label: "Qualquer marca" }, ...rows];
  }, [brandsQ.data]);

  const modelMenuItems = useMemo(() => {
    const seen = new Set<string>();
    const rows: { value: string; label: string }[] = [];
    for (const m of modelsQ.data ?? []) {
      if (seen.has(m.name)) continue;
      seen.add(m.name);
      rows.push({ value: m.name, label: m.name });
    }
    return [{ value: "", label: "Qualquer modelo" }, ...rows];
  }, [modelsQ.data]);

  const rotationSeed = useMemo(() => {
    if (!user?.id) return 0;
    let h = 0;
    for (let i = 0; i < user.id.length; i++) {
      h = (h + user.id.charCodeAt(i)) % 9973;
    }
    return h % 9999;
  }, [user?.id]);

  const queryFilters = useMemo(() => {
    const base = { ...applied, rotationSeed };
    if (user?.role === "OWNER") {
      const { ownerMinAverageStars: _stars, ...rest } = base;
      return { ...rest, ownerUserId: user.id };
    }
    return base;
  }, [applied, rotationSeed, user]);

  const q = trpc.marketplace.listAvailableVehicles.useQuery(queryFilters);

  const impressedIds = useRef(new Set<string>());
  const trackListImpression = trpc.marketplace.trackListImpression.useMutation();
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;

  useEffect(() => {
    impressedIds.current.clear();
  }, [queryFilters]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const token of viewableItems) {
        if (!token.isViewable || token.item == null) continue;
        const row = token.item as { id?: string };
        if (!row.id || impressedIds.current.has(row.id)) continue;
        impressedIds.current.add(row.id);
        trackListImpression.mutate({
          eventId: createAdEventId(),
          vehicleId: row.id,
        });
      }
    }
  ).current;

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
    setUfPickerExpanded(false);
    setCorPickerExpanded(false);
    setBrandPickerExpanded(false);
    setModelPickerExpanded(false);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setApplied({});
    setDraft(emptyDraft());
    setModalErr(null);
    setUfPickerExpanded(false);
    setCorPickerExpanded(false);
    setBrandPickerExpanded(false);
    setModelPickerExpanded(false);
    setFilterOpen(false);
  };

  const openFilters = () => {
    let d = draftFromApplied(applied);
    if (user?.role === "OWNER") {
      d = { ...d, ownerMinStars: "ANY" };
    }
    setDraft(d);
    setModalErr(null);
    setUfPickerExpanded(false);
    setCorPickerExpanded(false);
    setBrandPickerExpanded(false);
    setModelPickerExpanded(false);
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
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
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
                <View
                  style={[
                    styles.body,
                    (item as { effectiveHighlightTier?: VehicleHighlightTier })
                      .effectiveHighlightTier &&
                    (item as { effectiveHighlightTier: VehicleHighlightTier })
                      .effectiveHighlightTier !== "NORMAL"
                      ? styles.bodyWithBadge
                      : null,
                  ]}
                >
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
                    {formatVehicleMetaLine(
                      item.vehicleType,
                      item.portas,
                      item.lugares
                    )}
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
                {(item as { effectiveHighlightTier?: VehicleHighlightTier })
                  .effectiveHighlightTier &&
                (item as { effectiveHighlightTier: VehicleHighlightTier })
                  .effectiveHighlightTier !== "NORMAL" ? (
                  <View style={styles.tierBadgePos} pointerEvents="none">
                    <HighlightTierBadge
                      tier={
                        (item as { effectiveHighlightTier: VehicleHighlightTier })
                          .effectiveHighlightTier
                      }
                      compact
                    />
                  </View>
                ) : null}
              </View>
            </Card>
          </Pressable>
            {user?.role === "DRIVER" &&
            (index + 1) % MARKETPLACE_AD_EVERY_N === 0 ? (
              <AdSlot
                placement={AD_PLACEMENTS.MARKETPLACE_LIST}
                rotationSeed={index + 1}
              />
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
                <View style={styles.ufFieldWrap}>
                  <Text variant="labelSmall" style={styles.ufFieldLabel}>
                    UF (retirada)
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setUfPickerExpanded((open) => !open);
                      setCorPickerExpanded(false);
                      setBrandPickerExpanded(false);
                      setModelPickerExpanded(false);
                    }}
                    icon={ufPickerExpanded ? "chevron-up" : "chevron-down"}
                    contentStyle={styles.ufFieldButtonContent}
                    labelStyle={styles.ufFieldButtonLabel}
                    style={styles.ufFieldButton}
                  >
                    {pickupUfDisplayLabel(draft.pickupUf)}
                  </Button>
                </View>
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
              {ufPickerExpanded ? (
                <View
                  style={[
                    styles.ufInlinePanel,
                    {
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.ufInlineScroll}
                  >
                    {UF_MENU_ITEMS.map((item) => {
                      const selected = draft.pickupUf === item.value;
                      return (
                        <Pressable
                          key={item.value || "ANY"}
                          onPress={() => {
                            setDraft((d) => ({ ...d, pickupUf: item.value }));
                            setUfPickerExpanded(false);
                          }}
                          style={({ pressed }) => [
                            styles.ufInlineItem,
                            selected && {
                              backgroundColor: theme.colors.secondaryContainer,
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text variant="bodyMedium">{item.label}</Text>
                          {selected ? (
                            <Text
                              variant="labelMedium"
                              style={{ color: theme.colors.primary }}
                            >
                              ✓
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
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
              <View style={styles.corFieldWrap}>
                <Text variant="labelSmall" style={styles.ufFieldLabel}>
                  Marca
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setBrandPickerExpanded((open) => !open);
                    setModelPickerExpanded(false);
                    setCorPickerExpanded(false);
                    setUfPickerExpanded(false);
                  }}
                  icon={brandPickerExpanded ? "chevron-up" : "chevron-down"}
                  contentStyle={styles.ufFieldButtonContent}
                  labelStyle={styles.ufFieldButtonLabel}
                  style={styles.ufFieldButton}
                  loading={brandsQ.isLoading}
                >
                  {draft.brand.trim() ? draft.brand : "Qualquer"}
                </Button>
              </View>
              {brandPickerExpanded ? (
                <View
                  style={[
                    styles.ufInlinePanel,
                    {
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.ufInlineScroll}
                  >
                    {brandMenuItems.map((item) => {
                      const selected = draft.brand === item.value;
                      return (
                        <Pressable
                          key={item.value || "ANY_BRAND"}
                          onPress={() => {
                            setDraft((d) => ({
                              ...d,
                              brand: item.value,
                              model: "",
                            }));
                            setBrandPickerExpanded(false);
                          }}
                          style={({ pressed }) => [
                            styles.ufInlineItem,
                            selected && {
                              backgroundColor: theme.colors.secondaryContainer,
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text variant="bodyMedium">{item.label}</Text>
                          {selected ? (
                            <Text
                              variant="labelMedium"
                              style={{ color: theme.colors.primary }}
                            >
                              ✓
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
              <View style={styles.corFieldWrap}>
                <Text variant="labelSmall" style={styles.ufFieldLabel}>
                  Modelo
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    if (!draft.brand.trim()) return;
                    setModelPickerExpanded((open) => !open);
                    setBrandPickerExpanded(false);
                    setCorPickerExpanded(false);
                    setUfPickerExpanded(false);
                  }}
                  icon={modelPickerExpanded ? "chevron-up" : "chevron-down"}
                  contentStyle={styles.ufFieldButtonContent}
                  labelStyle={styles.ufFieldButtonLabel}
                  style={styles.ufFieldButton}
                  disabled={!draft.brand.trim()}
                  loading={!!draft.brand && modelsQ.isLoading}
                >
                  {!draft.brand.trim()
                    ? "Selecione a marca"
                    : draft.model.trim()
                      ? draft.model
                      : "Qualquer"}
                </Button>
              </View>
              {modelPickerExpanded && draft.brand.trim() ? (
                <View
                  style={[
                    styles.ufInlinePanel,
                    {
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.ufInlineScroll}
                  >
                    {modelMenuItems.map((item) => {
                      const selected = draft.model === item.value;
                      return (
                        <Pressable
                          key={item.value || "ANY_MODEL"}
                          onPress={() => {
                            setDraft((d) => ({ ...d, model: item.value }));
                            setModelPickerExpanded(false);
                          }}
                          style={({ pressed }) => [
                            styles.ufInlineItem,
                            selected && {
                              backgroundColor: theme.colors.secondaryContainer,
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text variant="bodyMedium">{item.label}</Text>
                          {selected ? (
                            <Text
                              variant="labelMedium"
                              style={{ color: theme.colors.primary }}
                            >
                              ✓
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
              <View style={styles.corFieldWrap}>
                <Text variant="labelSmall" style={styles.ufFieldLabel}>
                  Cor
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setCorPickerExpanded((open) => !open);
                    setUfPickerExpanded(false);
                    setBrandPickerExpanded(false);
                    setModelPickerExpanded(false);
                  }}
                  icon={corPickerExpanded ? "chevron-up" : "chevron-down"}
                  contentStyle={styles.ufFieldButtonContent}
                  labelStyle={styles.ufFieldButtonLabel}
                  style={styles.ufFieldButton}
                >
                  {pickupCorDisplayLabel(draft.cor)}
                </Button>
              </View>
              {corPickerExpanded ? (
                <View
                  style={[
                    styles.ufInlinePanel,
                    {
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.ufInlineScroll}
                  >
                    {COLOR_MENU_ITEMS.map((item) => {
                      const selected = draft.cor === item.value;
                      return (
                        <Pressable
                          key={item.value || "ANY_COR"}
                          onPress={() => {
                            setDraft((d) => ({ ...d, cor: item.value }));
                            setCorPickerExpanded(false);
                          }}
                          style={({ pressed }) => [
                            styles.ufInlineItem,
                            selected && {
                              backgroundColor: theme.colors.secondaryContainer,
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text variant="bodyMedium">{item.label}</Text>
                          {selected ? (
                            <Text
                              variant="labelMedium"
                              style={{ color: theme.colors.primary }}
                            >
                              ✓
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
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
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Tipo de veículo
              </Text>
              <SegmentedButtons
                value={draft.vehicleType}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    vehicleType: v as FilterDraft["vehicleType"],
                    model: "",
                    ...(v === "MOTORCYCLE" ? { portas: "", lugares: "" } : {}),
                  }))
                }
                buttons={[
                  { value: "ANY", label: "Qualquer" },
                  { value: "CAR", label: "Automóvel" },
                  { value: "MOTORCYCLE", label: "Moto" },
                ]}
                style={styles.segment}
              />
              {draft.vehicleType === "ANY" || draft.vehicleType === "CAR" ? (
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
              ) : null}
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
  cardClip: { borderRadius: 16, overflow: "hidden", position: "relative" },
  row: { flexDirection: "row" },
  cover: { width: 110, height: 110, backgroundColor: "#f1f5f9" },
  tierBadgePos: { position: "absolute", top: 8, right: 8, zIndex: 1 },
  bodyWithBadge: { paddingRight: 36 },
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
  ufInlinePanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  ufInlineScroll: {
    maxHeight: 220,
  },
  ufInlineItem: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: { marginBottom: 4 },
  modalSub: { opacity: 0.75, marginBottom: 12 },
  modalScroll: { maxHeight: 420 },
  field: { marginBottom: 10 },
  rowFields: { flexDirection: "row", gap: 8 },
  /** Espaço após o texto introdutório quando o bloco de estrelas está oculto (proprietário). */
  rowFieldsFirst: { marginTop: 4 },
  fieldHalf: { flex: 1 },
  ufFieldWrap: {
    flex: 1,
    marginBottom: 10,
  },
  corFieldWrap: {
    marginBottom: 10,
  },
  ufFieldLabel: {
    marginLeft: 4,
    marginBottom: 4,
    opacity: 0.8,
  },
  ufFieldButton: {
    borderRadius: 4,
  },
  ufFieldButtonContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  ufFieldButtonLabel: {
    flex: 1,
    textAlign: "left",
    marginHorizontal: 0,
  },
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
