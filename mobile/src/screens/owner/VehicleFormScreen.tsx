import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  contractTimeSuffix,
  formatMoneyWithContractPeriod,
  maskCep,
} from "../../utils/masks";
import {
  CepAddressForm,
  type CepAddressValue,
} from "../../components/CepAddressForm";
import { MenuTile } from "../../components/MenuTile";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleForm">;

const CONTRACT_OPTIONS = [
  { value: "DIARIO" as const, label: "Diário" },
  { value: "SEMANAL" as const, label: "Semanal" },
  { value: "MENSAL" as const, label: "Mensal" },
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
  const [year, setYear] = useState("");
  const [cor, setCor] = useState("");
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
    setBrand(v.brand ?? "");
    setModel(v.model ?? "");
    setYear(String(v.year ?? ""));
    setCor(v.cor ?? "");
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
    setDailyReais((v.dailyRateCents / 100).toFixed(2));
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

  const onSameAsOwnerChange = (next: boolean) => {
    if (next) {
      if (!ownerProfile) {
        Alert.alert(
          "Endereço do proprietário",
          "Cadastre seu endereço em Perfil do proprietário antes de usar esta opção."
        );
        return;
      }
      const cepDigits = ownerProfile.cep.replace(/\D/g, "");
      if (cepDigits.length !== 8) {
        Alert.alert(
          "CEP inválido",
          "Informe um CEP válido (8 dígitos) no perfil do proprietário."
        );
        return;
      }
      if (!ownerProfile.logradouro.trim() || !ownerProfile.bairro.trim()) {
        Alert.alert(
          "Endereço incompleto",
          "Complete logradouro e bairro no perfil do proprietário."
        );
        return;
      }
      if (!ownerProfile.cidade.trim() || ownerProfile.uf.trim().length !== 2) {
        Alert.alert(
          "Endereço incompleto",
          "Complete cidade e UF no perfil do proprietário."
        );
        return;
      }
      if (!ownerProfile.numero.trim()) {
        Alert.alert(
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
    const n = Number(dailyReais.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  };

  const onSubmit = () => {
    const cents = parseCents();
    if (cents == null) {
      setErr("Informe um valor válido.");
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
    const portasNum = parseInt(portasStr.replace(/\D/g, ""), 10);
    const lugaresNum = parseInt(lugaresStr.replace(/\D/g, ""), 10);
    if (!Number.isFinite(portasNum) || portasNum < 2 || portasNum > 8) {
      setErr("Portas: informe um número entre 2 e 8.");
      return;
    }
    if (!Number.isFinite(lugaresNum) || lugaresNum < 1 || lugaresNum > 15) {
      setErr("Lugares: informe um número entre 1 e 15.");
      return;
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
        <Field label="Marca" value={brand} onChangeText={setBrand} />
        <Field label="Modelo" value={model} onChangeText={setModel} />
        <Field
          label="Ano"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
        />
        <Field label="Cor" value={cor} onChangeText={setCor} />
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
        <Field
          label={`Valor do período (R$)${contractTimeSuffix(contractTime)}`}
          value={dailyReais}
          onChangeText={setDailyReais}
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
        visible={insurancePartnerPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setInsurancePartnerPickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setInsurancePartnerPickerOpen(false)}
        >
          <Pressable
            style={[
              styles.pickerSheet,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
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
