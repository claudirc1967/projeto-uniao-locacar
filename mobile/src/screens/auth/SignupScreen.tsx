import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Checkbox,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { trpc } from "../../api/trpc";
import { PRIVACY_POLICY_VERSION } from "../../constants/privacyPolicyVersion";
import { TERMS_OF_USE_VERSION } from "../../constants/termsOfUseVersion";
import {
  CepAddressForm,
  type CepAddressValue,
} from "../../components/CepAddressForm";
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { cpfCnpjValidationMessage } from "../../utils/cpfCnpj";
import { cepDigits, maskCpfCnpj, maskPhone, onlyDigits } from "../../utils/masks";
import {
  validateEmailForAuth,
  validatePasswordForAuth,
} from "../../utils/authValidation";
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
  const theme = useTheme();
  const { loginWithToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [role, setRole] = useState<"OWNER" | "DRIVER">("DRIVER");
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<CepAddressValue>(emptyAddr);
  const [err, setErr] = useState<string | null>(null);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

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
    const docErr = cpfCnpjValidationMessage(onlyDigits(cpfCnpj));
    if (docErr) {
      setErr(docErr);
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
    return true;
  };

  const submit = () => {
    setErr(null);
    if (!acceptPrivacy) {
      setErr("É necessário aceitar a Política de Privacidade.");
      return;
    }
    if (!acceptTerms) {
      setErr("É necessário aceitar os Termos de uso.");
      return;
    }
    const emailErr = validateEmailForAuth(email);
    if (emailErr) {
      setErr(emailErr);
      return;
    }
    const pwdErr = validatePasswordForAuth(password);
    if (pwdErr) {
      setErr(pwdErr);
      return;
    }
    if (role === "OWNER" && !validateOwner()) return;

    if (role === "DRIVER") {
      signup.mutate({
        email: email.trim(),
        password,
        role: "DRIVER",
        privacyPolicyAcceptedVersion: PRIVACY_POLICY_VERSION,
        termsOfUseAcceptedVersion: TERMS_OF_USE_VERSION,
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
      complemento: addr.complemento.trim() || "",
      privacyPolicyAcceptedVersion: PRIVACY_POLICY_VERSION,
      termsOfUseAcceptedVersion: TERMS_OF_USE_VERSION,
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMedium" style={styles.title}>
          Cadastro
        </Text>

        <Text variant="labelLarge" style={styles.labelAbove}>
          Perfil
        </Text>
        <SegmentedButtons
          value={role}
          onValueChange={(v) => setRole(v as "OWNER" | "DRIVER")}
          buttons={[
            { value: "DRIVER", label: "Motorista" },
            { value: "OWNER", label: "Proprietário" },
          ]}
          style={styles.segment}
        />

        <TextInput
          mode="outlined"
          label="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Senha (mín. 6)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          style={styles.field}
          right={
            <TextInput.Icon
              icon={secure ? "eye-outline" : "eye-off-outline"}
              onPress={() => setSecure((s) => !s)}
            />
          }
        />

        {role === "OWNER" ? (
          <Card mode="elevated" style={styles.card}>
            <Card.Title title="Dados do proprietário" />
            <Card.Content style={styles.cardBody}>
              <TextInput
                mode="outlined"
                label="Nome / Razão Social *"
                value={nomeRazaoSocial}
                onChangeText={setNomeRazaoSocial}
                placeholder="Nome completo ou razão social"
                style={styles.field}
              />
              <TextInput
                mode="outlined"
                label="CPF ou CNPJ *"
                value={cpfCnpj}
                onChangeText={(t) => setCpfCnpj(maskCpfCnpj(t))}
                keyboardType="number-pad"
                placeholder="Somente números ou com máscara"
                style={styles.field}
              />
              <TextInput
                mode="outlined"
                label="Telefone / WhatsApp *"
                value={phone}
                onChangeText={(t) => setPhone(maskPhone(t))}
                keyboardType="phone-pad"
                placeholder="Com DDD"
                style={styles.field}
              />
              <Text variant="titleSmall" style={styles.sectionAddr}>
                Endereço *
              </Text>
              <Text variant="bodySmall" style={styles.hint}>
                Informe o CEP e toque em Buscar CEP. Depois preencha o número;
                complemento é opcional.
              </Text>
              <CepAddressForm value={addr} onChange={setAddr} />
            </Card.Content>
          </Card>
        ) : null}

        <View style={styles.legalRow}>
          <Checkbox.Android
            status={acceptPrivacy ? "checked" : "unchecked"}
            onPress={() => setAcceptPrivacy((v) => !v)}
          />
          <View style={styles.legalTextWrap}>
            <Text variant="bodyMedium" style={styles.legalLine}>
              Li e aceito a{" "}
              <Text
                style={{ color: theme.colors.primary }}
                onPress={() => navigation.navigate("PrivacyPolicy")}
              >
                Política de Privacidade
              </Text>
              .
            </Text>
          </View>
        </View>

        <View style={styles.legalRow}>
          <Checkbox.Android
            status={acceptTerms ? "checked" : "unchecked"}
            onPress={() => setAcceptTerms((v) => !v)}
          />
          <View style={styles.legalTextWrap}>
            <Text variant="bodyMedium" style={styles.legalLine}>
              Li e aceito os{" "}
              <Text
                style={{ color: theme.colors.primary }}
                onPress={() => navigation.navigate("TermsOfUse")}
              >
                Termos de uso
              </Text>
              .
            </Text>
          </View>
        </View>

        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>
        <Button
          mode="contained"
          onPress={submit}
          loading={signup.isPending}
          disabled={signup.isPending}
          style={styles.primaryBtn}
        >
          Cadastrar
        </Button>
        <Button mode="text" onPress={() => navigation.navigate("Login")}>
          Já tenho conta
        </Button>
        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48, paddingBottom: 48, gap: 8 },
  title: { marginBottom: 8 },
  labelAbove: { marginTop: 8, marginBottom: 4, opacity: 0.85 },
  segment: { marginBottom: 8 },
  field: { marginBottom: 4, backgroundColor: "#fff" },
  card: { marginTop: 8, borderRadius: 16 },
  cardBody: { paddingTop: 0, gap: 4 },
  sectionAddr: { marginTop: 12, marginBottom: 4 },
  hint: { marginBottom: 8, opacity: 0.85 },
  primaryBtn: { marginTop: 8 },
  spacer: { height: 24 },
  legalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    gap: 4,
  },
  legalTextWrap: { flex: 1, paddingTop: 6 },
  legalLine: { flexWrap: "wrap", lineHeight: 22 },
});
