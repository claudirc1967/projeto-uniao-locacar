import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
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
  const { user } = useAuth();
  const ownerProfile = user?.role === "OWNER" ? user.ownerProfile : null;
  const vehicleId = route.params?.vehicleId;
  const existing = trpc.owner.getMyVehicle.useQuery(
    { vehicleId: vehicleId! },
    { enabled: !!vehicleId }
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [cor, setCor] = useState("");
  const [dailyReais, setDailyReais] = useState("");
  const [contractTime, setContractTime] = useState<
    "DIARIO" | "SEMANAL" | "MENSAL"
  >("DIARIO");
  const [kmLivre, setKmLivre] = useState(false);
  const [kmPorContrato, setKmPorContrato] = useState("");
  const [insuranceMaintenanceIncluded, setInsuranceMaintenanceIncluded] =
    useState(true);
  const [insurerPolicy, setInsurerPolicy] = useState("");
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

  useEffect(() => {
    if (!existing.data) return;
    const v = existing.data as any; // Evita divergência pontual de tipagem no editor.
    setTitle(v.title);
    setDescription(v.description ?? "");
    setPlate(formatPlate(v.plate ?? ""));
    setBrand(v.brand ?? "");
    setModel(v.model ?? "");
    setYear(v.year != null ? String(v.year) : "");
    setCor(v.cor ?? "");
    setContractTime(v.contractTime ?? "DIARIO");
    setKmLivre(!!v.kmLivre);
    setKmPorContrato(
      v.kmPorContrato != null ? String(v.kmPorContrato) : ""
    );
    setInsuranceMaintenanceIncluded(
      v.insuranceMaintenanceIncluded !== false
    );
    setInsurerPolicy(v.insurerPolicy ?? "");
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
        complemento: ownerProfile.complemento.trim() || "-",
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
    if (!pickupAddr.complemento.trim()) {
      setErr("Complemento é obrigatório (use - se necessário).");
      return;
    }
    const y = year.trim() ? parseInt(year, 10) : undefined;
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
        year: Number.isFinite(y!) ? y : undefined,
        cor: cor || undefined,
        contractTime,
        kmLivre,
        kmPorContrato: kmPorContratoNum,
        insuranceMaintenanceIncluded,
        insurerPolicy: insuranceMaintenanceIncluded
          ? insurerPolicy.trim() || null
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
        year: Number.isFinite(y!) ? y : undefined,
        cor: cor || undefined,
        contractTime,
        kmLivre,
        kmPorContrato: kmPorContratoNum,
        insuranceMaintenanceIncluded,
        insurerPolicy: insuranceMaintenanceIncluded
          ? insurerPolicy.trim() || null
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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (vehicleId && existing.isError) {
    return (
      <View style={styles.center}>
        <Text>{trpcErrorMessage(existing.error)}</Text>
      </View>
    );
  }

  const busy = create.isPending || update.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          {vehicleId ? "Editar veículo" : "Novo veículo"}
        </Text>
        {vehicleId ? (
          <Text style={styles.hint}>
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
          label={`Valor do período (R$)${contractTimeSuffix(contractTime)}`}
          value={dailyReais}
          onChangeText={setDailyReais}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Tempo de contrato</Text>
        <View style={styles.contractRow}>
          {CONTRACT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.contractChip,
                contractTime === opt.value && styles.contractChipOn,
              ]}
              onPress={() => setContractTime(opt.value)}
            >
              <Text
                style={[
                  styles.contractChipText,
                  contractTime === opt.value && styles.contractChipTextOn,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rowBetween}>
          <Text>Km livre</Text>
          <Switch value={kmLivre} onValueChange={setKmLivre} />
        </View>
        <Field
          label="Km por tempo de contrato"
          value={kmPorContrato}
          onChangeText={setKmPorContrato}
          keyboardType="number-pad"
        />
        <View style={styles.rowBetween}>
          <Text style={{ flex: 1, paddingRight: 8 }}>
            Seguro e manutenção inclusos
          </Text>
          <Switch
            value={insuranceMaintenanceIncluded}
            onValueChange={(v) => {
              setInsuranceMaintenanceIncluded(v);
              if (!v) setInsurerPolicy("");
            }}
          />
        </View>
        <Field
          label="Seguradora / Apólice"
          value={insurerPolicy}
          onChangeText={setInsurerPolicy}
          editable={insuranceMaintenanceIncluded}
        />

        <View style={styles.rowBetween}>
          <Text>Disponível para locação</Text>
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

        <Text style={[styles.label, { marginTop: 18 }]}>Local de retirada</Text>
        <View style={styles.rowBetween}>
          <Text style={{ flex: 1, paddingRight: 8 }}>
            O mesmo do proprietário?
          </Text>
          <Switch value={sameAsOwner} onValueChange={onSameAsOwnerChange} />
        </View>
        <CepAddressForm
          locked={sameAsOwner}
          value={pickupAddr}
          onChange={setPickupAddr}
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <AppButton
          title={vehicleId ? "Salvar" : "Criar e enviar fotos"}
          loading={busy}
          onPress={onSubmit}
        />
        {vehicleId ? (
          <AppButton
            title="Gerenciar fotos"
            variant="ghost"
            onPress={() =>
              navigation.navigate("VehiclePhotos", { vehicleId })
            }
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  editable = true,
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
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        placeholderTextColor="#94a3b8"
        {...props}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "700" },
  hint: { color: "#64748b", marginTop: 4 },
  label: { fontSize: 13, color: "#64748b", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#94a3b8",
  },
  contractRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  contractChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  contractChipOn: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  contractChipText: { fontSize: 14, color: "#64748b" },
  contractChipTextOn: { color: "#1d4ed8", fontWeight: "600" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  err: { color: "#dc2626", marginTop: 12 },
});
