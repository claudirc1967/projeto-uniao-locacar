import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import {
  Button,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
import { useAuth } from "../../hooks/AuthContext";
import { appAlert } from "../../utils/appAlert";
import {
  contractTimeSuffix,
  formatMoneyWithContractPeriod,
  maskCep,
  maskMoneyInput,
  moneyInputFromCents,
  onlyDigits,
} from "../../utils/masks";
import {
  CepAddressForm,
  type CepAddressValue,
} from "../../components/CepAddressForm";
import { MenuTile } from "../../components/MenuTile";
import {
  VEHICLE_TYPE_OPTIONS,
  type VehicleType,
} from "../../constants/vehicleType";
import {
  resolveVehicleColorLabel,
  VEHICLE_COLORS,
  vehicleColorDisplayLabel,
} from "../../constants/vehicleColors";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleForm">;

const CONTRACT_OPTIONS = [
  { value: "DIARIO" as const, label: "Diário" },
  { value: "SEMANAL" as const, label: "Semanal" },
  { value: "MENSAL" as const, label: "Mensal" },
];

const COLOR_PICKER_ROWS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Não informado", value: "" },
  ...VEHICLE_COLORS.map((c) => ({ label: c.label, value: c.label })),
];

const plateLegacyNormalizedRegex = /^[A-Z]{3}[0-9]{4}$/; // ABC1234
const plateMercosulNormalizedRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/; // ABC1D23

function normalizePlate(raw: string) {
  // Remove tudo que não seja letra/número e limita no tamanho interno (7 sem hífen).
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

function formatPlate(raw: string) {
  const n = normalizePlate(raw);
  const letters = n.replace(/[^A-Z]/g, "").slice(0, 3);
  const restSource = n.slice(letters.length);
  const rest = restSource.replace(/[^A-Z0-9]/g, "").slice(0, 4);
  if (rest.length === 0) return letters;
  return `${letters}-${rest}`;
}

function isValidPlate(raw: string) {
  const n = normalizePlate(raw);
  if (n.length !== 7) return false;
  return (
    plateLegacyNormalizedRegex.test(n) ||
    plateMercosulNormalizedRegex.test(n)
  );
}

export function VehicleFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();
  const ownerProfile = user?.role === "OWNER" ? user.ownerProfile : null;
  const vehicleId = route.params?.vehicleId;
  const existing = trpc.owner.getMyVehicle.useQuery(
    { vehicleId: vehicleId! },
    { enabled: !!vehicleId }
  );

  const insurancePartnersQ = trpc.owner.listMyPartners.useQuery(
    { category: "INSURANCE" },
    { staleTime: 30_000 }
  );

  const refetchInsurancePartners = insurancePartnersQ.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchInsurancePartners();
    }, [refetchInsurancePartners])
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [legacyBrandHint, setLegacyBrandHint] = useState<string | null>(null);
  const [legacyModelHint, setLegacyModelHint] = useState<string | null>(null);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [catalogHydratedForId, setCatalogHydratedForId] = useState<
    string | null
  >(null);
  const [year, setYear] = useState("");
  const [cor, setCor] = useState("");
  const [legacyCorHint, setLegacyCorHint] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>("CAR");
  const [portasStr, setPortasStr] = useState("4");
  const [lugaresStr, setLugaresStr] = useState("5");
  const [dailyReais, setDailyReais] = useState("");
  const [contractTime, setContractTime] = useState<
    "DIARIO" | "SEMANAL" | "MENSAL"
  >("DIARIO");
  const [kmLivre, setKmLivre] = useState(false);
  const [kmPorContrato, setKmPorContrato] = useState("");
  const [insuranceMaintenanceIncluded, setInsuranceMaintenanceIncluded] =
    useState(true);
  const [insurerPolicy, setInsurerPolicy] = useState("");
  const [insurancePartnerId, setInsurancePartnerId] = useState<string | null>(
    null
  );
  const [insurancePartnerPickerOpen, setInsurancePartnerPickerOpen] =
    useState(false);
  const [available, setAvailable] = useState(true);
  const [requirementsJson, setRequirementsJson] = useState("");
  const [paymentNotes, setPaymentNotes] = useState(
    "Dinheiro, PIX, Débito, Crédito, Boleto"
  );
  const [caucao, setCaucao] = useState(
    "A combinar com o locatário"
  );
  const [pickupAddr, setPickupAddr] = useState<CepAddressValue>({
    cep: "",
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
    numero: "",
    complemento: "",
  });
  const [sameAsOwner, setSameAsOwner] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const brandsQ = trpc.marketplace.listVehicleBrands.useQuery();
  const modelsQ = trpc.marketplace.listVehicleModels.useQuery(
    { brandName: brand, vehicleType },
    { enabled: brand.trim().length > 0 }
  );

  const brandPickerRows = useMemo(() => {
    const rows = (brandsQ.data ?? []).map((b) => ({
      value: b.name,
      label: b.name,
    }));
    return [{ value: "", label: "Não informado" }, ...rows];
  }, [brandsQ.data]);

  const modelPickerRows = useMemo(() => {
    const rows = (modelsQ.data ?? []).map((m) => ({
      value: m.name,
      label: m.name,
    }));
    return [{ value: "", label: "Não informado" }, ...rows];
  }, [modelsQ.data]);

  const insurancePickerRows = useMemo(() => {
    const none = { id: null as string | null, label: "Nenhum selecionado" };
    const partners = (insurancePartnersQ.data ?? []).map((p) => ({
      id: p.id,
      label: p.name,
    }));
    return [none, ...partners];
  }, [insurancePartnersQ.data]);

  const insurancePartnerLabel = useMemo(() => {
    if (!insurancePartnerId) return "Nenhum selecionado";
    const name = insurancePartnersQ.data?.find(
      (p) => p.id === insurancePartnerId
    )?.name;
    if (name) return name;
    return "Parceiro não listado (toque para alterar)";
  }, [insurancePartnerId, insurancePartnersQ.data]);

  useEffect(() => {
    if (!existing.data) return;
    const v = existing.data as any; // Evita divergência pontual de tipagem no editor.
    setTitle(v.title);
    setDescription(v.description ?? "");
    setPlate(formatPlate(v.plate ?? ""));
    setBrand(typeof v.brand === "string" ? v.brand.trim() : "");
    setModel(typeof v.model === "string" ? v.model.trim() : "");
    setLegacyBrandHint(null);
    setLegacyModelHint(null);
    setCatalogHydratedForId(null);
    setYear(String(v.year ?? ""));
    const rawCor = typeof v.cor === "string" ? v.cor.trim() : "";
    const resolved = resolveVehicleColorLabel(rawCor);
    if (resolved) {
      setCor(resolved);
      setLegacyCorHint(null);
    } else if (rawCor) {
      setCor("");
      setLegacyCorHint(rawCor);
    } else {
      setCor("");
      setLegacyCorHint(null);
    }
    setVehicleType(v.vehicleType === "MOTORCYCLE" ? "MOTORCYCLE" : "CAR");
    setPortasStr(
      v.portas != null && Number.isFinite(v.portas) ? String(v.portas) : "4"
    );
    setLugaresStr(
      v.lugares != null && Number.isFinite(v.lugares) ? String(v.lugares) : "5"
    );
    setContractTime(v.contractTime ?? "DIARIO");
    setKmLivre(!!v.kmLivre);
    setKmPorContrato(
      v.kmPorContrato != null ? String(v.kmPorContrato) : ""
    );
    setInsuranceMaintenanceIncluded(
      v.insuranceMaintenanceIncluded !== false
    );
    setInsurerPolicy(v.insurerPolicy ?? "");
    setInsurancePartnerId(
      typeof v.insurancePartnerId === "string" && v.insurancePartnerId
        ? v.insurancePartnerId
        : null
    );
    setDailyReais(moneyInputFromCents(v.dailyRateCents));
    setAvailable(v.available);
    setRequirementsJson(v.requirementsJson ?? "");
    setPaymentNotes(
      v.paymentNotes ?? "Dinheiro, PIX, Débito, Crédito, Boleto"
    );
    setCaucao(v.caucao ?? "A combinar com o locatário");
    setPickupAddr({
      cep: v.pickupCep ?? "",
      logradouro: v.pickupLogradouro ?? "",
      bairro: v.pickupBairro ?? "",
      cidade: v.pickupCity ?? "",
      uf: v.pickupUf ?? "",
      numero: v.pickupNumero ?? "",
      complemento: v.pickupComplemento ?? "",
    });
    setSameAsOwner(!!v.pickupSameAsOwner);
  }, [existing.data]);

  useEffect(() => {
    if (!vehicleId || !existing.data || !brandsQ.data) return;
    if (catalogHydratedForId === `${vehicleId}:brand`) return;
    const fold = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .trim();
    const rawBrand =
      typeof existing.data.brand === "string" ? existing.data.brand.trim() : "";
    const rawModel =
      typeof existing.data.model === "string" ? existing.data.model.trim() : "";

    if (!rawBrand) {
      setBrand("");
      setModel("");
      setLegacyBrandHint(null);
      setLegacyModelHint(rawModel || null);
      setCatalogHydratedForId(`${vehicleId}:done`);
      return;
    }

    const foundBrand = brandsQ.data.find((b) => fold(b.name) === fold(rawBrand));
    if (!foundBrand) {
      setBrand("");
      setModel("");
      setLegacyBrandHint(rawBrand);
      setLegacyModelHint(rawModel || null);
      setCatalogHydratedForId(`${vehicleId}:done`);
      return;
    }

    setBrand(foundBrand.name);
    setLegacyBrandHint(null);
    setCatalogHydratedForId(`${vehicleId}:brand`);
  }, [vehicleId, existing.data, brandsQ.data, catalogHydratedForId]);

  useEffect(() => {
    if (!vehicleId || !existing.data || !brand || !modelsQ.data) return;
    if (catalogHydratedForId !== `${vehicleId}:brand`) return;
    const fold = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .trim();
    const rawModel =
      typeof existing.data.model === "string" ? existing.data.model.trim() : "";
    if (!rawModel) {
      setModel("");
      setLegacyModelHint(null);
      setCatalogHydratedForId(`${vehicleId}:done`);
      return;
    }
    const foundModel = modelsQ.data.find((m) => fold(m.name) === fold(rawModel));
    if (foundModel) {
      setModel(foundModel.name);
      setLegacyModelHint(null);
    } else {
      setModel("");
      setLegacyModelHint(rawModel);
    }
    setCatalogHydratedForId(`${vehicleId}:done`);
  }, [
    vehicleId,
    existing.data,
    brand,
    modelsQ.data,
    catalogHydratedForId,
  ]);

  const onSameAsOwnerChange = (next: boolean) => {
    if (next) {
      if (!ownerProfile) {
        appAlert(
          "Endereço do proprietário",
          "Cadastre seu endereço em Perfil do proprietário antes de usar esta opção."
        );
        return;
      }
      const cepDigits = ownerProfile.cep.replace(/\D/g, "");
      if (cepDigits.length !== 8) {
        appAlert(
          "CEP inválido",
          "Informe um CEP válido (8 dígitos) no perfil do proprietário."
        );
        return;
      }
      if (!ownerProfile.logradouro.trim() || !ownerProfile.bairro.trim()) {
        appAlert(
          "Endereço incompleto",
          "Complete logradouro e bairro no perfil do proprietário."
        );
        return;
      }
      if (!ownerProfile.cidade.trim() || ownerProfile.uf.trim().length !== 2) {
        appAlert(
          "Endereço incompleto",
          "Complete cidade e UF no perfil do proprietário."
        );
        return;
      }
      if (!ownerProfile.numero.trim()) {
        appAlert(
          "Número obrigatório",
          "Informe o número do endereço no perfil do proprietário."
        );
        return;
      }
      setPickupAddr({
        cep: maskCep(ownerProfile.cep),
        logradouro: ownerProfile.logradouro,
        bairro: ownerProfile.bairro,
        cidade: ownerProfile.cidade,
        uf: ownerProfile.uf,
        numero: ownerProfile.numero,
        complemento: ownerProfile.complemento.trim(),
      });
      setSameAsOwner(true);
    } else {
      setPickupAddr({
        cep: "",
        logradouro: "",
        bairro: "",
        cidade: "",
        uf: "",
        numero: "",
        complemento: "",
      });
      setSameAsOwner(false);
    }
  };

  const utils = trpc.useUtils();

  const create = trpc.owner.createVehicle.useMutation({
    onSuccess: async (data) => {
      setErr(null);
      await utils.owner.listMyVehicles.invalidate();
      navigation.replace("VehiclePhotos", { vehicleId: data.vehicleId });
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  const update = trpc.owner.updateVehicle.useMutation({
    onSuccess: async () => {
      setErr(null);
      await utils.owner.listMyVehicles.invalidate();
      if (vehicleId) await utils.owner.getMyVehicle.invalidate({ vehicleId });
      navigation.goBack();
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  const parseCents = () => {
    const digits = onlyDigits(dailyReais);
    if (!digits) return null;
    const cents = parseInt(digits, 10);
    if (!Number.isFinite(cents) || cents <= 0) return null;
    return cents;
  };

  const onSubmit = () => {
    const cents = parseCents();
    if (cents == null) {
      setErr("Informe um valor válido.");
      return;
    }
    if (legacyCorHint) {
      setErr(
        `Selecione a cor canônica correspondente a "${legacyCorHint}" antes de salvar.`
      );
      return;
    }
    if (legacyBrandHint) {
      setErr(
        `Selecione a marca do catálogo correspondente a "${legacyBrandHint}" antes de salvar.`
      );
      return;
    }
    if (legacyModelHint) {
      setErr(
        `Selecione o modelo do catálogo correspondente a "${legacyModelHint}" antes de salvar.`
      );
      return;
    }
    if (!isValidPlate(plate)) {
      setErr("Placa inválida. Use `ABC-1234` (antiga) ou `ABC-1D23` (Mercosul).");
      return;
    }
    if (!pickupAddr.cep || pickupAddr.cep.replace(/\D/g, "").length !== 8) {
      setErr("Informe o CEP de retirada (8 dígitos).");
      return;
    }
    if (!pickupAddr.logradouro.trim() || !pickupAddr.bairro.trim()) {
      setErr("Busque o CEP para preencher endereço de retirada.");
      return;
    }
    if (!pickupAddr.cidade.trim() || pickupAddr.uf.trim().length !== 2) {
      setErr("Endereço de retirada incompleto (cidade/UF).");
      return;
    }
    if (!pickupAddr.numero.trim()) {
      setErr("Número do endereço de retirada é obrigatório.");
      return;
    }
    const portasNum =
      vehicleType === "CAR"
        ? parseInt(portasStr.replace(/\D/g, ""), 10)
        : null;
    const lugaresNum =
      vehicleType === "CAR"
        ? parseInt(lugaresStr.replace(/\D/g, ""), 10)
        : null;
    if (vehicleType === "CAR") {
      if (!Number.isFinite(portasNum!) || portasNum! < 2 || portasNum! > 8) {
        setErr("Portas: informe um número entre 2 e 8.");
        return;
      }
      if (!Number.isFinite(lugaresNum!) || lugaresNum! < 1 || lugaresNum! > 15) {
        setErr("Lugares: informe um número entre 1 e 15.");
        return;
      }
    }
    if (!year.trim()) {
      setErr("Informe o ano do veículo.");
      return;
    }
    const y = parseInt(year.replace(/\D/g, ""), 10);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) {
      setErr("Ano inválido (use um valor entre 1900 e 2100).");
      return;
    }
    const kmParsed = kmPorContrato.trim()
      ? parseInt(kmPorContrato.replace(/\D/g, ""), 10)
      : 0;
    const kmPorContratoNum = Number.isFinite(kmParsed) ? kmParsed : 0;
    if (vehicleId) {
      update.mutate({
        vehicleId,
        title,
        description: description || undefined,
        plate,
        brand: brand || undefined,
        model: model || undefined,
        year: y,
        cor: cor || undefined,
        vehicleType,
        portas: portasNum,
        lugares: lugaresNum,
        contractTime,
        kmLivre,
        kmPorContrato: kmPorContratoNum,
        insuranceMaintenanceIncluded,
        insurerPolicy: insuranceMaintenanceIncluded
          ? insurerPolicy.trim() || null
          : null,
        insurancePartnerId: insuranceMaintenanceIncluded
          ? insurancePartnerId ?? null
          : null,
        dailyRateCents: cents,
        available,
        requirementsJson: requirementsJson || undefined,
        paymentNotes: paymentNotes || undefined,
        caucao: caucao.trim() || null,
        pickupCity: pickupAddr.cidade || undefined,
        pickupUf: pickupAddr.uf || undefined,
        pickupCep: pickupAddr.cep || undefined,
        pickupLogradouro: pickupAddr.logradouro || undefined,
        pickupBairro: pickupAddr.bairro || undefined,
        pickupNumero: pickupAddr.numero || undefined,
        pickupComplemento: pickupAddr.complemento || undefined,
        pickupSameAsOwner: sameAsOwner,
      });
    } else {
      create.mutate({
        title,
        description: description || undefined,
        plate,
        brand: brand || undefined,
        model: model || undefined,
        year: y,
        cor: cor || undefined,
        vehicleType,
        portas: portasNum,
        lugares: lugaresNum,
        contractTime,
        kmLivre,
        kmPorContrato: kmPorContratoNum,
        insuranceMaintenanceIncluded,
        insurerPolicy: insuranceMaintenanceIncluded
          ? insurerPolicy.trim() || null
          : null,
        insurancePartnerId: insuranceMaintenanceIncluded
          ? insurancePartnerId ?? null
          : null,
        dailyRateCents: cents,
        available,
        requirementsJson: requirementsJson || undefined,
        paymentNotes: paymentNotes || undefined,
        caucao: caucao.trim() || null,
        pickupCity: pickupAddr.cidade || undefined,
        pickupUf: pickupAddr.uf || undefined,
        pickupCep: pickupAddr.cep || undefined,
        pickupLogradouro: pickupAddr.logradouro || undefined,
        pickupBairro: pickupAddr.bairro || undefined,
        pickupNumero: pickupAddr.numero || undefined,
        pickupComplemento: pickupAddr.complemento || undefined,
        pickupSameAsOwner: sameAsOwner,
      });
    }
  };

  if (vehicleId && existing.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (vehicleId && existing.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>
          {trpcErrorMessage(existing.error)}
        </Text>
      </View>
    );
  }

  const busy = create.isPending || update.isPending;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall">
          {vehicleId ? "Editar veículo" : "Novo veículo"}
        </Text>
        {vehicleId ? (
          <Text variant="bodyMedium" style={styles.hint}>
            Valor atual:{" "}
            {existing.data
              ? formatMoneyWithContractPeriod(
                  existing.data.dailyRateCents,
                  contractTime
                )
              : "—"}
          </Text>
        ) : null}

        <Field label="Título" value={title} onChangeText={setTitle} />
        <Field
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Field
          label="Placa"
          value={plate}
          onChangeText={(t) => setPlate(formatPlate(t))}
          maxLength={8}
          autoCorrect={false}
          autoCapitalize="characters"
        />
        <Text variant="labelLarge" style={{ marginTop: 14 }}>
          Tipo de veículo
        </Text>
        <SegmentedButtons
          value={vehicleType}
          onValueChange={(v) => {
            const next = v as VehicleType;
            setVehicleType(next);
            setModel("");
            setLegacyModelHint(null);
          }}
          buttons={VEHICLE_TYPE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          style={{ marginTop: 8 }}
        />
        <Text variant="labelLarge" style={{ marginTop: 14 }}>
          Marca
        </Text>
        <Button
          mode="outlined"
          onPress={() => setBrandPickerOpen(true)}
          icon="chevron-down"
          contentStyle={{ justifyContent: "flex-start" }}
          style={{ marginTop: 8 }}
          loading={brandsQ.isLoading}
        >
          {brand.trim() ? brand : "Selecionar marca"}
        </Button>
        {legacyBrandHint ? (
          <HelperText type="info" visible>
            Marca atual no cadastro: {legacyBrandHint}. Selecione a marca do
            catálogo correspondente antes de salvar.
          </HelperText>
        ) : null}
        <Text variant="labelLarge" style={{ marginTop: 14 }}>
          Modelo
        </Text>
        <Button
          mode="outlined"
          onPress={() => setModelPickerOpen(true)}
          icon="chevron-down"
          contentStyle={{ justifyContent: "flex-start" }}
          style={{ marginTop: 8 }}
          disabled={!brand.trim()}
          loading={!!brand && modelsQ.isLoading}
        >
          {!brand.trim()
            ? "Selecione a marca primeiro"
            : model.trim()
              ? model
              : "Selecionar modelo"}
        </Button>
        {legacyModelHint ? (
          <HelperText type="info" visible>
            Modelo atual no cadastro: {legacyModelHint}. Selecione o modelo do
            catálogo correspondente antes de salvar.
          </HelperText>
        ) : null}
        <Field
          label="Ano"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
        />
        <Text variant="labelLarge" style={{ marginTop: 14 }}>
          Cor
        </Text>
        <Button
          mode="outlined"
          onPress={() => setColorPickerOpen(true)}
          icon="chevron-down"
          contentStyle={{ justifyContent: "flex-start" }}
          style={{ marginTop: 8 }}
        >
          {vehicleColorDisplayLabel(cor || null)}
        </Button>
        {legacyCorHint ? (
          <HelperText type="info" visible>
            Cor atual no cadastro: {legacyCorHint}. Selecione a cor canônica
            correspondente antes de salvar.
          </HelperText>
        ) : null}
        {vehicleType === "CAR" ? (
          <>
            <Field
              label="Portas"
              value={portasStr}
              onChangeText={setPortasStr}
              keyboardType="number-pad"
            />
            <Field
              label="Lugares"
              value={lugaresStr}
              onChangeText={setLugaresStr}
              keyboardType="number-pad"
            />
          </>
        ) : null}
        <Field
          label={`Valor do período (R$)${contractTimeSuffix(contractTime)}`}
          value={dailyReais}
          onChangeText={(t) => setDailyReais(maskMoneyInput(t))}
          keyboardType="decimal-pad"
        />

        <Text variant="labelLarge" style={{ marginTop: 14 }}>
          Tempo de contrato
        </Text>
        <SegmentedButtons
          value={contractTime}
          onValueChange={(v) =>
            setContractTime(v as "DIARIO" | "SEMANAL" | "MENSAL")
          }
          buttons={CONTRACT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          style={{ marginTop: 8 }}
        />

        <View style={styles.rowBetween}>
          <Text variant="bodyMedium">Km livre</Text>
          <Switch value={kmLivre} onValueChange={setKmLivre} />
        </View>
        <Field
          label="Km por tempo de contrato"
          value={kmPorContrato}
          onChangeText={setKmPorContrato}
          keyboardType="number-pad"
        />
        <View style={styles.rowBetween}>
          <Text variant="bodyMedium" style={{ flex: 1, paddingRight: 8 }}>
            Seguro e manutenção inclusos
          </Text>
          <Switch
            value={insuranceMaintenanceIncluded}
            onValueChange={(v) => {
              setInsuranceMaintenanceIncluded(v);
              if (!v) {
                setInsurerPolicy("");
                setInsurancePartnerId(null);
              }
            }}
          />
        </View>
        {insuranceMaintenanceIncluded ? (
          <View style={styles.insurancePartnerBlock}>
            <Text variant="labelLarge" style={{ marginTop: 14 }}>
              Parceiro seguradora
            </Text>
            <Text
              variant="bodySmall"
              style={{ marginTop: 6, opacity: 0.85, marginBottom: 4 }}
            >
              Use parceiros cadastrados com o tipo &quot;Seguradora&quot;.
            </Text>
            <Button
              mode="outlined"
              onPress={() => setInsurancePartnerPickerOpen(true)}
              style={{ marginTop: 4 }}
            >
              {insurancePartnerLabel}
            </Button>
            <Field
              label="Número da apólice"
              value={insurerPolicy}
              onChangeText={setInsurerPolicy}
              placeholder="Número da apólice"
            />
          </View>
        ) : null}

        <View style={styles.rowBetween}>
          <Text variant="bodyMedium">Disponível para locação</Text>
          <Switch value={available} onValueChange={setAvailable} />
        </View>
        <Field
          label="Requisitos para locação"
          value={requirementsJson}
          onChangeText={setRequirementsJson}
          placeholder="CNH B (não pode ser provisória), etc"
          multiline
        />
        <Field
          label="Pagamento / observações"
          value={paymentNotes}
          onChangeText={setPaymentNotes}
          multiline
        />
        <Field
          label="Caução"
          value={caucao}
          onChangeText={setCaucao}
          multiline
        />

        <Text variant="labelLarge" style={{ marginTop: 18 }}>
          Local de retirada
        </Text>
        <View style={styles.rowBetween}>
          <Text variant="bodyMedium" style={{ flex: 1, paddingRight: 8 }}>
            O mesmo do proprietário?
          </Text>
          <Switch value={sameAsOwner} onValueChange={onSameAsOwnerChange} />
        </View>
        <CepAddressForm
          locked={sameAsOwner}
          value={pickupAddr}
          onChange={setPickupAddr}
        />

        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>

        <Button
          mode="contained"
          loading={busy}
          disabled={busy}
          onPress={onSubmit}
          style={{ marginTop: 8 }}
        >
          {vehicleId ? "Salvar" : "Criar e enviar fotos"}
        </Button>
        {vehicleId ? (
          <View style={styles.photosTileWrap}>
            <MenuTile
              title="Gerenciar fotos"
              icon="image-multiple-outline"
              fullWidth
              accentColor="#b45309"
              onPress={() =>
                navigation.navigate("VehiclePhotos", { vehicleId })
              }
            />
            <MenuTile
              title="Gerenciar parceiros"
              subtitle="Seguradora e fornecedores"
              icon="handshake-outline"
              fullWidth
              accentColor="#b45309"
              onPress={() => navigation.navigate("OwnerPartners")}
            />
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={brandPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setBrandPickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setBrandPickerOpen(false)}
        >
          <Pressable
            style={[
              styles.pickerSheet,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="titleMedium" style={styles.pickerTitle}>
              Marca do veículo
            </Text>
            <FlatList
              data={brandPickerRows}
              keyExtractor={(item) => item.value || "__none__"}
              renderItem={({ item }) => {
                const selected = item.value === brand;
                return (
                  <Pressable
                    onPress={() => {
                      setBrand(item.value);
                      setModel("");
                      setLegacyBrandHint(null);
                      setLegacyModelHint(null);
                      setBrandPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.pickerItem,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text variant="bodyMedium">{item.label}</Text>
                    {selected ? (
                      <Text
                        variant="labelMedium"
                        style={styles.pickerSelected}
                      >
                        Selecionado
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
              style={{ maxHeight: 420 }}
            />
            <Button mode="text" onPress={() => setBrandPickerOpen(false)}>
              Fechar
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={modelPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setModelPickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModelPickerOpen(false)}
        >
          <Pressable
            style={[
              styles.pickerSheet,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="titleMedium" style={styles.pickerTitle}>
              Modelo do veículo
            </Text>
            <FlatList
              data={modelPickerRows}
              keyExtractor={(item) => item.value || "__none__"}
              renderItem={({ item }) => {
                const selected = item.value === model;
                return (
                  <Pressable
                    onPress={() => {
                      setModel(item.value);
                      setLegacyModelHint(null);
                      setModelPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.pickerItem,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text variant="bodyMedium">{item.label}</Text>
                    {selected ? (
                      <Text
                        variant="labelMedium"
                        style={styles.pickerSelected}
                      >
                        Selecionado
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
              style={{ maxHeight: 420 }}
            />
            <Button mode="text" onPress={() => setModelPickerOpen(false)}>
              Fechar
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={colorPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setColorPickerOpen(false)}
      >
        {isWeb ? (
          <View style={styles.modalBackdrop}>
            <View
              style={[styles.pickerSheet, { backgroundColor: theme.colors.surface }]}
            >
              <Text variant="titleMedium" style={styles.pickerTitle}>
                Cor do veículo
              </Text>
              <FlatList
                data={COLOR_PICKER_ROWS}
                keyExtractor={(item) => item.value || "__none__"}
                renderItem={({ item }) => {
                  const selected = item.value === cor;
                  return (
                    <Pressable
                      onPress={() => {
                        setCor(item.value);
                        setLegacyCorHint(null);
                        setColorPickerOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text variant="bodyMedium">{item.label}</Text>
                      {selected ? (
                        <Text variant="labelMedium" style={styles.pickerSelected}>
                          Selecionado
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
                style={{ maxHeight: 420 }}
              />
              <Button mode="text" onPress={() => setColorPickerOpen(false)}>
                Fechar
              </Button>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setColorPickerOpen(false)}
          >
            <Pressable
              style={[
                styles.pickerSheet,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text variant="titleMedium" style={styles.pickerTitle}>
                Cor do veículo
              </Text>
              <FlatList
                data={COLOR_PICKER_ROWS}
                keyExtractor={(item) => item.value || "__none__"}
                renderItem={({ item }) => {
                  const selected = item.value === cor;
                  return (
                    <Pressable
                      onPress={() => {
                        setCor(item.value);
                        setLegacyCorHint(null);
                        setColorPickerOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text variant="bodyMedium">{item.label}</Text>
                      {selected ? (
                        <Text
                          variant="labelMedium"
                          style={styles.pickerSelected}
                        >
                          Selecionado
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
                style={{ maxHeight: 420 }}
              />
              <Button mode="text" onPress={() => setColorPickerOpen(false)}>
                Fechar
              </Button>
            </Pressable>
          </Pressable>
        )}
      </Modal>

      <Modal
        visible={insurancePartnerPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setInsurancePartnerPickerOpen(false)}
      >
        {isWeb ? (
          <View style={styles.modalBackdrop}>
            <View
              style={[styles.pickerSheet, { backgroundColor: theme.colors.surface }]}
            >
              <Text variant="titleMedium" style={styles.pickerTitle}>
                Parceiro seguradora
              </Text>
              <FlatList
                data={insurancePickerRows}
                keyExtractor={(item) => (item.id == null ? "__none__" : item.id)}
                renderItem={({ item }) => {
                  const selected =
                    (item.id == null && insurancePartnerId == null) ||
                    (item.id != null && item.id === insurancePartnerId);
                  return (
                    <Pressable
                      onPress={() => {
                        setInsurancePartnerId(item.id);
                        setInsurancePartnerPickerOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text variant="bodyMedium">{item.label}</Text>
                      {selected ? (
                        <Text variant="labelMedium" style={styles.pickerSelected}>
                          Selecionado
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
                style={{ maxHeight: 420 }}
              />
              <Button mode="text" onPress={() => setInsurancePartnerPickerOpen(false)}>
                Fechar
              </Button>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setInsurancePartnerPickerOpen(false)}
          >
            <Pressable
              style={[
                styles.pickerSheet,
                { backgroundColor: theme.colors.surface },
              ]}
            >
            <Text variant="titleMedium" style={styles.pickerTitle}>
              Parceiro seguradora
            </Text>
            <FlatList
              data={insurancePickerRows}
              keyExtractor={(item) => (item.id == null ? "__none__" : item.id)}
              renderItem={({ item }) => {
                const selected =
                  (item.id == null && insurancePartnerId == null) ||
                  (item.id != null && item.id === insurancePartnerId);
                return (
                  <Pressable
                    onPress={() => {
                      setInsurancePartnerId(item.id);
                      setInsurancePartnerPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.pickerItem,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text variant="bodyMedium">{item.label}</Text>
                    {selected ? (
                      <Text
                        variant="labelMedium"
                        style={styles.pickerSelected}
                      >
                        Selecionado
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
              style={{ maxHeight: 420 }}
            />
            <Button
              mode="text"
              onPress={() => setInsurancePartnerPickerOpen(false)}
            >
              Fechar
            </Button>
            </Pressable>
          </Pressable>
        )}
      </Modal>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  editable = true,
  multiline,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  maxLength?: number;
  editable?: boolean;
  autoCorrect?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <TextInput
      mode="outlined"
      label={label}
      placeholderTextColor="#94a3b8"
      style={{ marginTop: 8, backgroundColor: theme.colors.surface }}
      disabled={!editable}
      multiline={multiline}
      contentStyle={multiline ? { minHeight: 88 } : undefined}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  hint: { marginTop: 4, opacity: 0.85 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  photosTileWrap: {
    marginTop: 24,
    gap: 12,
  },
  insurancePartnerBlock: { marginBottom: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    width: "92%",
    maxWidth: 520,
    alignSelf: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  pickerTitle: { marginBottom: 10 },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerSelected: { opacity: 0.7 },
  pickerSep: { height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0" },
});
