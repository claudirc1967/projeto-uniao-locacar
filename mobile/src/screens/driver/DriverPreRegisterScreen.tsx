import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
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
import { cpfValidationMessage } from "../../utils/cpfCnpj";
import { maskCpf, maskDate, maskPhone, onlyDigits } from "../../utils/masks";
import { maskCep } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "DriverPreRegister">;

type DriverProfileForm = NonNullable<
  NonNullable<ReturnType<typeof trpc.driver.myStatus.useQuery>["data"]>["profile"]
>;

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
    refetchOnWindowFocus: false,
  });

  const scrollRef = useRef<ScrollView>(null);
  /** Evita sobrescrever o formulário quando myStatus refaz fetch (comum no iOS). */
  const formHydratedRef = useRef(false);
  const addrRef = useRef<CepAddressValue>(emptyAddr);

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const applyProfileToForm = useCallback((p: DriverProfileForm) => {
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
    const nextAddr: CepAddressValue = {
      cep: maskCep(p.cep ?? ""),
      logradouro: p.logradouro ?? "",
      bairro: p.bairro ?? "",
      cidade: p.cidade ?? "",
      uf: p.uf ?? "",
      numero: p.numero ?? "",
      complemento: p.complemento ?? "",
    };
    addrRef.current = nextAddr;
    setAddr(nextAddr);
  }, []);

  const setAddrSynced = useCallback(
    (next: CepAddressValue | ((prev: CepAddressValue) => CepAddressValue)) => {
      setAddr((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        addrRef.current = resolved;
        return resolved;
      });
    },
    []
  );

  const save = trpc.driver.completePreRegistration.useMutation({
    onSuccess: async () => {
      setErr(null);
      await utils.driver.myStatus.invalidate();
      await utils.auth.me.invalidate();
      const fresh = await utils.driver.myStatus.fetch();
      if (fresh?.profile) {
        applyProfileToForm(fresh.profile);
      }
      setSuccessMsg("Cadastro salvo.");
    },
    onError: (e) => {
      setSuccessMsg(null);
      setErr(trpcErrorMessage(e));
    },
  });

  useFocusEffect(
    useCallback(() => {
      formHydratedRef.current = false;
      return () => {
        formHydratedRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    const p = statusQuery.data?.profile;
    if (!p || formHydratedRef.current) return;
    formHydratedRef.current = true;
    applyProfileToForm(p);
  }, [statusQuery.data, applyProfileToForm]);

  const runSubmit = () => {
    const currentAddr = addrRef.current;
    const cpfErr = cpfValidationMessage(onlyDigits(cpf));
    if (cpfErr) {
      setErr(cpfErr);
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErr("Informe o nome completo.");
      return;
    }
    if (onlyDigits(phone).length < 8) {
      setErr("Informe um telefone válido.");
      return;
    }
    if (!cnhHasEar) {
      setErr("Ative a opção de CNH com EAR.");
      return;
    }
    if (!criminalAttestation) {
      setErr("Ative a opção de Atestado de Antecedentes Criminais.");
      return;
    }
    if (!currentAddr.cep.replace(/\D/g, "").length) {
      setErr("Informe o CEP e use Buscar CEP.");
      return;
    }
    if (
      !currentAddr.logradouro.trim() ||
      !currentAddr.bairro.trim() ||
      !currentAddr.cidade.trim() ||
      !currentAddr.uf.trim()
    ) {
      setErr("Busque o CEP para preencher o endereço.");
      return;
    }
    if (!currentAddr.numero.trim()) {
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
    const years = Number(cnhYears);
    if (!Number.isFinite(years) || years <= 0) {
      setErr("Informe os anos de habilitação (número válido).");
      return;
    }
    setSuccessMsg(null);
    save.mutate({
      fullName: fullName.trim(),
      phone: onlyDigits(phone),
      cpf: onlyDigits(cpf),
      cnh: cnh.trim(),
      cnhCategory: cnhCategory.trim(),
      cnhValidity: cnhValidity.trim(),
      cnhYears: years,
      cnhHasEar,
      criminalAttestation,
      uberRegistered,
      cep: currentAddr.cep,
      logradouro: currentAddr.logradouro.trim(),
      bairro: currentAddr.bairro.trim(),
      cidade: currentAddr.cidade.trim(),
      uf: currentAddr.uf.trim(),
      numero: currentAddr.numero.trim(),
      complemento: currentAddr.complemento.trim(),
    });
  };

  /** No iOS o último campo (complemento) pode não “commitar” antes do onPress. */
  const submit = () => {
    setErr(null);
    Keyboard.dismiss();
    const delayMs = Platform.OS === "ios" ? 280 : 0;
    setTimeout(runSubmit, delayMs);
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
              onChange={setAddrSynced}
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
        <HelperText type="info" visible={!!successMsg}>
          {successMsg ?? ""}
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
