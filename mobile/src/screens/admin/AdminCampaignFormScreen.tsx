import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Chip,
  HelperText,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import {
  AD_CAMPAIGN_STATUSES,
  AD_PLACEMENT_OPTIONS,
  AD_TARGET_ROLES,
  adCampaignStatusLabel,
  adPlacementLabel,
  adTargetRoleLabel,
  formatDateInput,
  parseCommaList,
  parseOptionalDate,
  type AdCampaignStatus,
  type AdTargetRole,
} from "../../constants/adCampaign";
import type { AdPlacementKey } from "../../constants/adPlacements";
import type { RootStackParamList } from "../../navigation/types";
import { maskDate } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";
import { CampaignAdPreview } from "../../components/ads/CampaignAdPreview";

type Props = NativeStackScreenProps<RootStackParamList, "AdminCampaignForm">;

type FormState = {
  status: AdCampaignStatus;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  clickUrl: string;
  placements: AdPlacementKey[];
  targetRoles: AdTargetRole[];
  targetUfs: string;
  targetCidades: string;
  nationwide: boolean;
  priority: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm = (): FormState => ({
  status: "DRAFT",
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaLabel: "Saiba mais",
  clickUrl: "",
  placements: ["DRIVER_HOME"],
  targetRoles: ["DRIVER"],
  targetUfs: "",
  targetCidades: "",
  nationwide: true,
  priority: "0",
  startsAt: "",
  endsAt: "",
});

type CampaignDetail = NonNullable<
  ReturnType<typeof trpc.ads.admin.get.useQuery>["data"]
>;

function campaignToForm(c: CampaignDetail): FormState {
  return {
    status: c.status as AdCampaignStatus,
    title: c.title,
    subtitle: c.subtitle ?? "",
    imageUrl: c.imageUrl ?? "",
    ctaLabel: c.ctaLabel,
    clickUrl: c.clickUrl,
    placements: c.placements as AdPlacementKey[],
    targetRoles: c.targetRoles as AdTargetRole[],
    targetUfs: c.targetUfs.join(", "),
    targetCidades: c.targetCidades.join(", "),
    nationwide: c.nationwide,
    priority: String(c.priority),
    startsAt: formatDateInput(c.startsAt),
    endsAt: formatDateInput(c.endsAt),
  };
}

function toggleItem<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function AdminCampaignFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const campaignId = route.params?.campaignId;
  const isEdit = Boolean(campaignId);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formReady, setFormReady] = useState(!isEdit);
  const [err, setErr] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const detailQ = trpc.ads.admin.get.useQuery(
    { id: campaignId ?? "" },
    { enabled: isEdit }
  );

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm());
      setFormReady(true);
      return;
    }
    setFormReady(false);
    if (!detailQ.data) return;
    setForm(campaignToForm(detailQ.data));
    setFormReady(true);
  }, [isEdit, campaignId, detailQ.data]);

  const createM = trpc.ads.admin.create.useMutation({
    onSuccess: async () => {
      await utils.ads.admin.list.invalidate();
      navigation.goBack();
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  const updateM = trpc.ads.admin.update.useMutation({
    onSuccess: async () => {
      await utils.ads.admin.list.invalidate();
      if (campaignId) {
        await utils.ads.admin.get.invalidate({ id: campaignId });
      }
      navigation.goBack();
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  const saving = createM.isPending || updateM.isPending;

  const validate = (): string | null => {
    if (!form.title.trim()) return "Informe o título";
    if (!form.clickUrl.trim()) return "Informe a URL de destino";
    if (form.placements.length === 0) return "Selecione ao menos um placement";
    const priority = Number(form.priority);
    if (!Number.isInteger(priority)) return "Prioridade deve ser um número inteiro";
    if (form.startsAt.trim() && !parseOptionalDate(form.startsAt)) {
      return "Data de início inválida. Use DD/MM/AAAA.";
    }
    if (form.endsAt.trim() && !parseOptionalDate(form.endsAt)) {
      return "Data de fim inválida. Use DD/MM/AAAA.";
    }
    return null;
  };

  const onSave = () => {
    setErr(null);
    const validationErr = validate();
    if (validationErr) {
      setErr(validationErr);
      return;
    }

    const payload = {
      status: form.status,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      ctaLabel: form.ctaLabel.trim() || "Saiba mais",
      clickUrl: form.clickUrl.trim(),
      placements: form.placements,
      targetRoles: form.targetRoles,
      targetUfs: parseCommaList(form.targetUfs).map((uf) => uf.toUpperCase()),
      targetCidades: parseCommaList(form.targetCidades).map((c) => c.toLowerCase()),
      nationwide: form.nationwide,
      priority: Number(form.priority),
      startsAt: parseOptionalDate(form.startsAt),
      endsAt: parseOptionalDate(form.endsAt),
      sourcePartnerId: null,
    };

    if (isEdit && campaignId) {
      updateM.mutate({ id: campaignId, ...payload });
    } else {
      createM.mutate(payload);
    }
  };

  if (isEdit && (detailQ.isLoading || !formReady)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isEdit && detailQ.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 12, textAlign: "center" }}>
          {trpcErrorMessage(detailQ.error)}
        </Text>
        <Button mode="contained" onPress={() => detailQ.refetch()}>
          Tentar de novo
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
          styles.container,
          { paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={styles.title}>
          {isEdit ? "Editar campanha" : "Nova campanha"}
        </Text>

        <Text variant="labelLarge" style={styles.sectionLabel}>
          Status
        </Text>
        <View style={styles.chipRow}>
          {AD_CAMPAIGN_STATUSES.map((status) => (
            <Chip
              key={status}
              selected={form.status === status}
              onPress={() => setForm((f) => ({ ...f, status }))}
              style={styles.chip}
              compact
            >
              {adCampaignStatusLabel(status)}
            </Chip>
          ))}
        </View>

        <TextInput
          mode="outlined"
          label="Título *"
          value={form.title}
          onChangeText={(title) => setForm((f) => ({ ...f, title }))}
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Subtítulo"
          value={form.subtitle}
          onChangeText={(subtitle) => setForm((f) => ({ ...f, subtitle }))}
          multiline
          style={styles.field}
          contentStyle={styles.multilineInput}
        />
        <TextInput
          mode="outlined"
          label="URL da imagem"
          value={form.imageUrl}
          onChangeText={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
          autoCapitalize="none"
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Texto do botão (CTA)"
          value={form.ctaLabel}
          onChangeText={(ctaLabel) => setForm((f) => ({ ...f, ctaLabel }))}
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="URL de destino *"
          value={form.clickUrl}
          onChangeText={(clickUrl) => setForm((f) => ({ ...f, clickUrl }))}
          autoCapitalize="none"
          keyboardType="url"
          style={styles.field}
        />

        <Text variant="labelLarge" style={styles.sectionLabel}>
          Placements *
        </Text>
        <View style={styles.chipRow}>
          {AD_PLACEMENT_OPTIONS.map((placement) => (
            <Chip
              key={placement}
              selected={form.placements.includes(placement)}
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  placements: toggleItem(f.placements, placement),
                }))
              }
              style={styles.chip}
              compact
            >
              {adPlacementLabel(placement)}
            </Chip>
          ))}
        </View>

        <CampaignAdPreview form={form} />

        <Text variant="labelLarge" style={styles.sectionLabel}>
          Público (roles)
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Vazio = todos os papéis elegíveis no placement.
        </Text>
        <View style={styles.chipRow}>
          {AD_TARGET_ROLES.map((role) => (
            <Chip
              key={role}
              selected={form.targetRoles.includes(role)}
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  targetRoles: toggleItem(f.targetRoles, role),
                }))
              }
              style={styles.chip}
              compact
            >
              {adTargetRoleLabel(role)}
            </Chip>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text variant="bodyLarge">Brasil inteiro (nationwide)</Text>
          <Switch
            value={form.nationwide}
            onValueChange={(nationwide) => setForm((f) => ({ ...f, nationwide }))}
          />
        </View>

        {!form.nationwide ? (
          <>
            <TextInput
              mode="outlined"
              label="UFs alvo (separadas por vírgula)"
              value={form.targetUfs}
              onChangeText={(targetUfs) => setForm((f) => ({ ...f, targetUfs }))}
              placeholder="SP, RJ"
              autoCapitalize="characters"
              style={styles.field}
            />
            <TextInput
              mode="outlined"
              label="Cidades alvo (separadas por vírgula)"
              value={form.targetCidades}
              onChangeText={(targetCidades) =>
                setForm((f) => ({ ...f, targetCidades }))
              }
              placeholder="são paulo, campinas"
              style={styles.field}
            />
          </>
        ) : null}

        <TextInput
          mode="outlined"
          label="Prioridade"
          value={form.priority}
          onChangeText={(priority) => setForm((f) => ({ ...f, priority }))}
          keyboardType="number-pad"
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Início"
          value={form.startsAt}
          onChangeText={(startsAt) =>
            setForm((f) => ({ ...f, startsAt: maskDate(startsAt) }))
          }
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Fim"
          value={form.endsAt}
          onChangeText={(endsAt) =>
            setForm((f) => ({ ...f, endsAt: maskDate(endsAt) }))
          }
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          style={styles.field}
        />

        {isEdit && detailQ.data ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Métricas: {detailQ.data.stats.impressions} impressões ·{" "}
            {detailQ.data.stats.clicks} cliques
          </Text>
        ) : null}

        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>

        <Button
          mode="contained"
          icon="content-save-outline"
          onPress={onSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        >
          Salvar campanha
        </Button>
        <Button mode="outlined" onPress={() => navigation.goBack()} disabled={saving}>
          Cancelar
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  container: { padding: 16, gap: 8, maxWidth: 720, width: "100%", alignSelf: "center" },
  title: { fontWeight: "600", marginBottom: 8 },
  sectionLabel: { marginTop: 8 },
  field: {
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  multilineInput: {
    minHeight: 72,
    paddingTop: 12,
    paddingBottom: 12,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  chip: { alignSelf: "flex-start" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  saveBtn: { marginTop: 8 },
});
