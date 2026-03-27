import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import {
  CepAddressForm,
  type CepAddressValue,
} from "../../components/CepAddressForm";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";
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
    if (!onlyDigits(phone) || onlyDigits(phone).length < 8)
      return setErr("Telefone/WhatsApp é obrigatório.");
    if (!addr.cep.trim()) return setErr("CEP é obrigatório.");
    if (!addr.logradouro.trim())
      return setErr("Busque o CEP para preencher o endereço.");
    if (!addr.numero.trim()) return setErr("Número do endereço é obrigatório.");
    if (!addr.complemento.trim())
      return setErr("Complemento é obrigatório (use - se necessário).");

    update.mutate({
      nomeRazaoSocial: nomeRazaoSocial.trim(),
      emailLocador: emailLocador.trim().toLowerCase(),
      // O template é editado em uma tela separada; aqui preservamos o valor atual.
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
      complemento: addr.complemento,
    });
  };

  if (!current) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Editar dados do proprietário</Text>

        <Text style={styles.label}>Nome/Razão Social *</Text>
        <TextInput
          style={styles.input}
          value={nomeRazaoSocial}
          onChangeText={setNomeRazaoSocial}
          placeholder="Nome completo ou razão social"
        />

        <Text style={styles.label}>CPF/CNPJ *</Text>
        <TextInput
          style={styles.input}
          value={cpfCnpj}
          onChangeText={(t) => setCpfCnpj(maskCpfCnpj(t))}
          keyboardType="number-pad"
          placeholder="Somente números"
        />

        <Text style={styles.label}>E-mail locador *</Text>
        <TextInput
          style={styles.input}
          value={emailLocador}
          onChangeText={setEmailLocador}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="email@empresa.com"
        />

        <Text style={styles.label}>Template de contrato</Text>
        <Text style={styles.hint}>
          {current.contractTemplateText?.trim()
            ? `Configurado (${current.contractTemplateText.trim().length} caracteres)`
            : "Não configurado"}
        </Text>
        <AppButton
          title="Editar template"
          variant="ghost"
          onPress={() => navigation.navigate("OwnerContractTemplate")}
        />

        <Text style={styles.label}>Telefone/WhatsApp *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(t) => setPhone(maskPhone(t))}
          keyboardType="phone-pad"
          placeholder="Com DDD"
        />

        <CepAddressForm value={addr} onChange={setAddr} />

        {err ? <Text style={styles.err}>{err}</Text> : null}
        <AppButton
          title={update.isPending ? "Salvando..." : "Salvar"}
          loading={update.isPending}
          onPress={submit}
        />
        <AppButton
          title="Cancelar"
          variant="ghost"
          disabled={update.isPending}
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 13, color: "#64748b", marginTop: 10 },
  hint: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  err: { color: "#dc2626", marginTop: 12 },
});

