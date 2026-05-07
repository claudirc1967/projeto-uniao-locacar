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
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";
import { cpfCnpjValidationMessage } from "../../utils/cpfCnpj";
import { maskCpfCnpj, maskPhone, onlyDigits } from "../../utils/masks";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerProfileEdit">;

const emptyAddr: CepAddressValue = {
  cep: "",
  logradouro: "",
  bairro: "",
  cidade: "",
  uf: "",
  numero: "",
  complemento: "",
};

export function OwnerProfileEditScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const current = user?.ownerProfile;

  const [nomeRazaoSocial, setNomeRazaoSocial] = useState("");
  const [emailLocador, setEmailLocador] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<CepAddressValue>(emptyAddr);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    setNomeRazaoSocial(current.nomeRazaoSocial ?? "");
    setEmailLocador(current.emailLocador ?? user?.email ?? "");
    setCpfCnpj(maskCpfCnpj(current.cpfCnpj ?? ""));
    setPhone(maskPhone(current.phone ?? ""));
    setAddr({
      cep: current.cep,
      logradouro: current.logradouro,
      bairro: current.bairro,
      cidade: current.cidade,
      uf: current.uf,
      numero: current.numero,
      complemento: current.complemento,
    });
  }, [current]);

  const update = trpc.owner.updateMyOwnerProfile.useMutation({
    onSuccess: async () => {
      setErr(null);
      await utils.auth.me.invalidate();
      navigation.goBack();
    },
    onError: (e) => setErr(trpcErrorMessage(e, "Falha ao salvar.")),
  });

  const submit = () => {
    setErr(null);
    if (!current) return setErr("Perfil do proprietário não encontrado.");

    if (!nomeRazaoSocial.trim())
      return setErr("Nome/Razão Social é obrigatório.");
    if (!emailLocador.trim())
      return setErr("E-mail locador é obrigatório.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLocador.trim()))
      return setErr("Informe um e-mail locador válido.");
    if (!onlyDigits(cpfCnpj).trim()) return setErr("CPF/CNPJ é obrigatório.");
    const docErr = cpfCnpjValidationMessage(onlyDigits(cpfCnpj));
    if (docErr) return setErr(docErr);
    if (!onlyDigits(phone) || onlyDigits(phone).length < 8)
      return setErr("Telefone/WhatsApp é obrigatório.");
    if (!addr.cep.trim()) return setErr("CEP é obrigatório.");
    if (!addr.logradouro.trim())
      return setErr("Busque o CEP para preencher o endereço.");
    if (!addr.numero.trim()) return setErr("Número do endereço é obrigatório.");

    update.mutate({
      nomeRazaoSocial: nomeRazaoSocial.trim(),
      emailLocador: emailLocador.trim().toLowerCase(),
      contractTemplateText: current.contractTemplateText?.trim()
        ? current.contractTemplateText
        : null,
      cpfCnpj: onlyDigits(cpfCnpj),
      phone: onlyDigits(phone),
      cep: addr.cep,
      logradouro: addr.logradouro,
      bairro: addr.bairro,
      cidade: addr.cidade,
      uf: addr.uf,
      numero: addr.numero,
      complemento: addr.complemento.trim(),
    });
  };

  if (!current) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          mode="outlined"
          label="Nome/Razão Social *"
          value={nomeRazaoSocial}
          onChangeText={setNomeRazaoSocial}
          placeholder="Nome completo ou razão social"
          style={styles.field}
        />

        <TextInput
          mode="outlined"
          label="CPF/CNPJ *"
          value={cpfCnpj}
          onChangeText={(t) => setCpfCnpj(maskCpfCnpj(t))}
          keyboardType="number-pad"
          placeholder="Somente números"
          style={styles.field}
        />

        <TextInput
          mode="outlined"
          label="E-mail locador *"
          value={emailLocador}
          onChangeText={setEmailLocador}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="email@empresa.com"
          style={styles.field}
        />

        <Text variant="labelLarge" style={styles.labelAbove}>
          Template de contrato
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {current.contractTemplateText?.trim()
            ? `Configurado (${current.contractTemplateText.trim().length} caracteres)`
            : "Não configurado"}
        </Text>
        <Button
          mode="outlined"
          icon="file-document-edit-outline"
          onPress={() => navigation.navigate("OwnerContractTemplate")}
          style={styles.btn}
        >
          Editar template
        </Button>

        <TextInput
          mode="outlined"
          label="Telefone/WhatsApp *"
          value={phone}
          onChangeText={(t) => setPhone(maskPhone(t))}
          keyboardType="phone-pad"
          placeholder="Com DDD"
          style={styles.field}
        />

        <CepAddressForm value={addr} onChange={setAddr} />

        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
        <Button
          mode="contained"
          loading={update.isPending}
          disabled={update.isPending}
          onPress={submit}
          style={styles.btn}
        >
          {update.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button
          mode="outlined"
          icon="arrow-left"
          disabled={update.isPending}
          onPress={() => navigation.goBack()}
        >
          Cancelar
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  title: { marginBottom: 12 },
  labelAbove: { marginTop: 8, marginBottom: 4, opacity: 0.85 },
  hint: {
    marginBottom: 8,
    lineHeight: 18,
    opacity: 0.85,
  },
  field: { marginBottom: 4, backgroundColor: "#fff" },
  btn: { marginTop: 8 },
});
