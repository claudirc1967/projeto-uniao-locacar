import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import {
  Button,
  Card,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../api/trpc";
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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text variant="headlineSmall" style={styles.title}>
          Pré-cadastro
        </Text>
        {statusQuery.isLoading ? (
          <Text variant="bodyMedium" style={styles.hint}>
            Carregando dados…
          </Text>
        ) : null}

        <TextInput
          mode="outlined"
          label="Nome completo"
          value={fullName}
          onChangeText={setFullName}
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Telefone"
          value={phone}
          onChangeText={(t) => setPhone(maskPhone(t))}
          keyboardType="phone-pad"
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="CPF"
          value={cpf}
          onChangeText={(t) => setCpf(maskCpf(t))}
          keyboardType="number-pad"
          style={styles.field}
        />

        <Card mode="elevated" style={styles.card}>
          <Card.Title title="Carteira de habilitação (CNH)" />
          <Card.Content style={styles.cardBody}>
            <TextInput
              mode="outlined"
              label="Número da CNH *"
              value={cnh}
              onChangeText={setCnh}
              keyboardType="number-pad"
              placeholder="Número da CNH"
              style={styles.field}
            />
            <TextInput
              mode="outlined"
              label="Categoria da CNH *"
              value={cnhCategory}
              onChangeText={setCnhCategory}
              placeholder="B"
              style={styles.field}
            />
            <TextInput
              mode="outlined"
              label="Validade da CNH *"
              value={cnhValidity}
              onChangeText={(t) => setCnhValidity(maskDate(t))}
              placeholder="DD/MM/AAAA"
              style={styles.field}
            />
            <TextInput
              mode="outlined"
              label="Anos de habilitação *"
              value={cnhYears}
              onChangeText={setCnhYears}
              keyboardType="number-pad"
              placeholder="Ex.: 3"
              style={styles.field}
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
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Title title="Informações sobre o aplicativo" />
          <Card.Content style={styles.cardBody}>
            <RowSwitch
              label="Já estou cadastrado no aplicativo (Uber, 99, etc.)"
              value={uberRegistered}
              onChange={setUberRegistered}
            />
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Title title="Endereço" />
          <Card.Content style={styles.cardBody}>
            <CepAddressForm
              value={addr}
              onChange={setAddr}
              onNumeroFocus={() => {
                setTimeout(
                  () => scrollRef.current?.scrollToEnd({ animated: true }),
                  50
                );
              }}
              onComplementoFocus={() => {
                setTimeout(
                  () => scrollRef.current?.scrollToEnd({ animated: true }),
                  50
                );
              }}
            />
          </Card.Content>
        </Card>

        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
        <Button
          mode="contained"
          onPress={submit}
          loading={save.isPending}
          disabled={save.isPending}
          style={styles.saveBtn}
        >
          Salvar
        </Button>
        <View style={styles.spacer} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
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
      <Text variant="bodySmall" style={styles.rowSwitchLabel}>
        {label}
      </Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 48 },
  title: { marginBottom: 12 },
  hint: { marginBottom: 12, opacity: 0.85 },
  field: { marginBottom: 4, backgroundColor: "#fff" },
  card: { marginTop: 12, borderRadius: 16 },
  cardBody: { paddingTop: 0, gap: 4 },
  rowSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    paddingVertical: 4,
  },
  rowSwitchLabel: { flex: 1, lineHeight: 18, opacity: 0.9 },
  saveBtn: { marginTop: 8 },
  spacer: { height: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
