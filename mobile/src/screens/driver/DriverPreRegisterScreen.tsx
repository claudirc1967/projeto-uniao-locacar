import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Switch,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import {
  CepAddressForm,
  type CepAddressValue,
} from "../../components/CepAddressForm";
import { trpcErrorMessage } from "../../utils/trpcError";
import type { RootStackParamList } from "../../navigation/types";
import { maskCpf, maskDate, maskPhone, onlyDigits } from "../../utils/masks";
import { maskCep } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "DriverPreRegister">;

const emptyAddr: CepAddressValue = {
  cep: "",
  logradouro: "",
  bairro: "",
  cidade: "",
  uf: "",
  numero: "",
  complemento: "",
};

export function DriverPreRegisterScreen({ navigation }: Props) {
  const statusQuery = trpc.driver.myStatus.useQuery(undefined, {
    retry: false,
  });

  const scrollRef = useRef<ScrollView>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnh, setCnh] = useState("");
  const [cnhCategory, setCnhCategory] = useState("B");
  const [cnhValidity, setCnhValidity] = useState("");
  const [cnhYears, setCnhYears] = useState("");
  const [cnhHasEar, setCnhHasEar] = useState(false);
  const [criminalAttestation, setCriminalAttestation] = useState(false);
  const [uberRegistered, setUberRegistered] = useState(false);
  const [addr, setAddr] = useState<CepAddressValue>(emptyAddr);
  const [err, setErr] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const save = trpc.driver.completePreRegistration.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await utils.driver.myStatus.invalidate();
      navigation.navigate("DriverStatus");
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  useEffect(() => {
    const p = statusQuery.data?.profile;
    if (!p) return;

    setFullName(p.fullName ?? "");
    setPhone(maskPhone(p.phone ?? ""));
    setCpf(maskCpf(p.cpf ?? ""));
    setCnh(p.cnh ?? "");
    setCnhCategory(p.cnhCategory ?? "");
    setCnhValidity(maskDate(p.cnhValidity ?? ""));
    setCnhYears(p.cnhYears != null ? String(p.cnhYears) : "");
    setCnhHasEar(Boolean(p.cnhHasEar));
    setCriminalAttestation(Boolean(p.criminalAttestation));
    setUberRegistered(Boolean(p.uberRegistered));

    setAddr({
      cep: maskCep(p.cep ?? ""),
      logradouro: p.logradouro ?? "",
      bairro: p.bairro ?? "",
      cidade: p.cidade ?? "",
      uf: p.uf ?? "",
      numero: p.numero ?? "",
      complemento: p.complemento ?? "",
    });
  }, [statusQuery.data]);

  const submit = () => {
    if (!addr.numero.trim()) {
      setErr("Informe o número do endereço.");
      return;
    }
    if (!cnh.trim()) {
      setErr("Informe o número da CNH.");
      return;
    }
    if (!cnhCategory.trim()) {
      setErr("Informe a categoria da CNH.");
      return;
    }
    if (!cnhValidity.trim()) {
      setErr("Informe a validade da CNH (DD/MM/AAAA).");
      return;
    }
    if (!cnhYears.trim()) {
      setErr("Informe os anos de habilitação.");
      return;
    }
    save.mutate({
      fullName,
      phone: onlyDigits(phone),
      cpf: onlyDigits(cpf),
      cnh,
      cnhCategory,
      cnhValidity,
      cnhYears: Number(cnhYears),
      cnhHasEar,
      criminalAttestation,
      uberRegistered,
      cep: addr.cep,
      logradouro: addr.logradouro,
      bairro: addr.bairro,
      cidade: addr.cidade,
      uf: addr.uf,
      numero: addr.numero,
      complemento: addr.complemento || undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Pré-cadastro</Text>
        {statusQuery.isLoading ? (
          <Text style={styles.hint}>Carregando dados…</Text>
        ) : null}
        <Text style={styles.label}>Nome completo</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(t) => setPhone(maskPhone(t))}
        />
        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={styles.input}
          value={cpf}
          onChangeText={(t) => setCpf(maskCpf(t))}
          keyboardType="number-pad"
        />
        <Text style={styles.sectionTitle}>CARTEIRA DE HABILITAÇÃO (CNH)</Text>

        <Text style={styles.label}>Número da CNH *</Text>
        <TextInput
          style={styles.input}
          value={cnh}
          onChangeText={setCnh}
          keyboardType="number-pad"
          placeholder="Número da CNH"
        />

        <Text style={styles.label}>Categoria da CNH *</Text>
        <TextInput
          style={styles.input}
          value={cnhCategory}
          onChangeText={setCnhCategory}
          placeholder="B"
        />

        <Text style={styles.label}>Validade da CNH *</Text>
        <TextInput
          style={styles.input}
          value={cnhValidity}
          onChangeText={(t) => setCnhValidity(maskDate(t))}
          placeholder="DD/MM/AAAA"
        />

        <Text style={styles.label}>Anos de habilitação *</Text>
        <TextInput
          style={styles.input}
          value={cnhYears}
          onChangeText={setCnhYears}
          keyboardType="number-pad"
          placeholder="Ex.: 3"
        />

        <RowSwitch
          label="CNH com EAR (Exerce Atividade Remunerada) *"
          value={cnhHasEar}
          onChange={setCnhHasEar}
        />
        <RowSwitch
          label="Atestado de Antecedentes Criminais *"
          value={criminalAttestation}
          onChange={setCriminalAttestation}
        />

        <Text style={styles.sectionTitle}>INFORMAÇÕES SOBRE O APLICATIVO</Text>
        <RowSwitch
          label="Já estou cadastrado no aplicativo (Uber, 99, etc.)"
          value={uberRegistered}
          onChange={setUberRegistered}
        />
        <CepAddressForm
          value={addr}
          onChange={setAddr}
          onNumeroFocus={() => {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
          }}
          onComplementoFocus={() => {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
          }}
        />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <AppButton
          title="Salvar"
          loading={save.isPending}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RowSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.rowSwitch}>
      <Text style={styles.rowSwitchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  hint: { fontSize: 13, color: "#64748b", marginBottom: 12 },
  label: { fontSize: 13, color: "#64748b", marginTop: 10 },
  sectionTitle: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  rowSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
    paddingVertical: 4,
  },
  rowSwitchLabel: { flex: 1, fontSize: 13, color: "#64748b", lineHeight: 18 },
  err: { color: "#dc2626", marginTop: 12 },
});
