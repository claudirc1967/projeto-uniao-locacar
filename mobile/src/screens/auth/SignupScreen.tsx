import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { trpc } from "../../api/trpc";
import { AppButton } from "../../components/AppButton";
import { PasswordInput } from "../../components/PasswordInput";
import {
  CepAddressForm,
  type CepAddressValue,
} from "../../components/CepAddressForm";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { cepDigits, maskCpfCnpj, maskPhone, onlyDigits } from "../../utils/masks";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

const emptyAddr: CepAddressValue = {
  cep: "",
  logradouro: "",
  bairro: "",
  cidade: "",
  uf: "",
  numero: "",
  complemento: "",
};

export function SignupScreen({ navigation }: Props) {
  const { loginWithToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "DRIVER">("DRIVER");
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<CepAddressValue>(emptyAddr);
  const [err, setErr] = useState<string | null>(null);

  const signup = trpc.auth.signup.useMutation({
    onSuccess: async (data) => {
      setErr(null);
      await loginWithToken(data.token);
    },
    onError: (e) => setErr(trpcErrorMessage(e)),
  });

  const validateOwner = (): boolean => {
    if (!nomeRazaoSocial.trim()) {
      setErr("Nome / Razão Social é obrigatório.");
      return false;
    }
    const doc = onlyDigits(cpfCnpj);
    if (doc.length !== 11 && doc.length !== 14) {
      setErr("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
      return false;
    }
    if (!onlyDigits(phone) || onlyDigits(phone).length < 8) {
      setErr("Telefone / WhatsApp é obrigatório.");
      return false;
    }
    const cep = cepDigits(addr.cep);
    if (cep.length !== 8) {
      setErr("CEP completo (8 dígitos) é obrigatório.");
      return false;
    }
    if (!addr.logradouro.trim()) {
      setErr("Busque o CEP para preencher o logradouro.");
      return false;
    }
    if (!addr.bairro.trim() || !addr.cidade.trim() || addr.uf.length !== 2) {
      setErr("Endereço incompleto. Busque o CEP novamente.");
      return false;
    }
    if (!addr.numero.trim()) {
      setErr("Número do endereço é obrigatório.");
      return false;
    }
    if (!addr.complemento.trim()) {
      setErr("Complemento é obrigatório (use - se não houver).");
      return false;
    }
    return true;
  };

  const submit = () => {
    setErr(null);
    if (role === "OWNER" && !validateOwner()) return;

    if (role === "DRIVER") {
      signup.mutate({
        email: email.trim(),
        password,
        role: "DRIVER",
      });
      return;
    }

    signup.mutate({
      email: email.trim(),
      password,
      role: "OWNER",
      nomeRazaoSocial: nomeRazaoSocial.trim(),
      cpfCnpj,
      phone: onlyDigits(phone),
      cep: addr.cep,
      logradouro: addr.logradouro.trim(),
      bairro: addr.bairro.trim(),
      cidade: addr.cidade.trim(),
      uf: addr.uf.trim().toUpperCase(),
      numero: addr.numero.trim(),
      complemento: addr.complemento.trim(),
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Cadastro</Text>
        <Text style={styles.label}>Perfil</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, role === "DRIVER" && styles.chipOn]}
            onPress={() => setRole("DRIVER")}
          >
            <Text style={role === "DRIVER" ? styles.chipTextOn : styles.chipText}>
              Motorista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, role === "OWNER" && styles.chipOn]}
            onPress={() => setRole("OWNER")}
          >
            <Text style={role === "OWNER" ? styles.chipTextOn : styles.chipText}>
              Proprietário
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>Senha (mín. 6)</Text>
        <PasswordInput value={password} onChangeText={setPassword} />

        {role === "OWNER" ? (
          <>
            <Text style={styles.section}>Dados do proprietário</Text>
            <Text style={styles.label}>Nome / Razão Social *</Text>
            <TextInput
              style={styles.input}
              value={nomeRazaoSocial}
              onChangeText={setNomeRazaoSocial}
              placeholder="Nome completo ou razão social"
            />
            <Text style={styles.label}>CPF ou CNPJ *</Text>
            <TextInput
              style={styles.input}
              value={cpfCnpj}
              onChangeText={(t) => setCpfCnpj(maskCpfCnpj(t))}
              keyboardType="number-pad"
              placeholder="Somente números ou com máscara"
            />
            <Text style={styles.label}>Telefone / WhatsApp *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => setPhone(maskPhone(t))}
              keyboardType="phone-pad"
              placeholder="Com DDD"
            />
            <Text style={styles.section}>Endereço *</Text>
            <Text style={styles.hint}>
              Informe o CEP e toque em Buscar CEP. Depois preencha número e
              complemento.
            </Text>
            <CepAddressForm value={addr} onChange={setAddr} />
          </>
        ) : null}

        {err ? <Text style={styles.err}>{err}</Text> : null}
        <AppButton title="Cadastrar" loading={signup.isPending} onPress={submit} />
        <AppButton
          title="Já tenho conta"
          variant="ghost"
          onPress={() => navigation.navigate("Login")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 48, gap: 8, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  section: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 16,
  },
  hint: { fontSize: 13, color: "#64748b", lineHeight: 18 },
  label: { fontSize: 14, color: "#64748b", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 10, marginTop: 4 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  chipOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#334155" },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  err: { color: "#dc2626", marginTop: 8 },
});
