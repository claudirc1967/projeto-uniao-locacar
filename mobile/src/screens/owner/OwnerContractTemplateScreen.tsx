import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerContractTemplate">;

export function OwnerContractTemplateScreen({ navigation }: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const current = user?.ownerProfile;
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setText(current?.contractTemplateText ?? "");
  }, [current?.contractTemplateText]);

  const update = trpc.owner.updateMyOwnerProfile.useMutation({
    onSuccess: async () => {
      setErr(null);
      await utils.auth.me.invalidate();
      navigation.goBack();
    },
    onError: (e) => setErr(trpcErrorMessage(e, "Falha ao salvar.")),
  });

  const importFromTxt = async () => {
    setErr(null);
    let uri: string | null = null;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/plain",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) {
        setErr("Não foi possível ler o arquivo selecionado.");
        return;
      }
      uri = file.uri;
      let content = "";

      try {
        content = await FileSystem.readAsStringAsync(uri);
      } catch (e1) {
        const baseDir =
          (FileSystem as any).cacheDirectory ??
          (FileSystem as any).documentDirectory;
        const cacheUri = baseDir ? `${baseDir}contract-template.txt` : null;
        if (!cacheUri) throw e1;
        await FileSystem.copyAsync({ from: uri, to: cacheUri });
        content = await FileSystem.readAsStringAsync(cacheUri);
      }

      if (!content.trim()) {
        setErr("O arquivo de contrato está vazio.");
        return;
      }
      setText(content);
      Alert.alert("Template importado", "Texto do contrato carregado com sucesso.");
    } catch (e) {
      if (uri) {
        try {
          const resp = await fetch(uri);
          const txt = await resp.text();
          if (txt.trim()) {
            setText(txt);
            Alert.alert(
              "Template importado",
              "Texto do contrato carregado com sucesso."
            );
            return;
          }
        } catch {
          // ignore
        }
      }
      setErr(
        `Falha ao importar o arquivo .txt (${e instanceof Error ? e.message : "erro desconhecido"}).`
      );
    }
  };

  const submit = () => {
    setErr(null);
    if (!current) return setErr("Perfil do proprietário não encontrado.");

    // O backend exige todos os campos do perfil. Aqui preservamos os valores atuais
    // e atualizamos apenas `contractTemplateText`.
    update.mutate({
      nomeRazaoSocial: current.nomeRazaoSocial,
      emailLocador: current.emailLocador,
      contractTemplateText: text.trim() ? text : null,
      cpfCnpj: current.cpfCnpj,
      phone: current.phone,
      cep: current.cep,
      logradouro: current.logradouro,
      bairro: current.bairro,
      cidade: current.cidade,
      uf: current.uf,
      numero: current.numero,
      complemento: current.complemento,
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
        <Text style={styles.title}>Template de contrato</Text>
        <Text style={styles.hint}>
          {`Use placeholders no formato {{CHAVE}}. Ex.: {{LOCADOR_NOME_RAZAO}}, {{VEICULO_PLACA}}, {{LOCATARIO_CPF}}.`}
        </Text>

        <TextInput
          style={[styles.input, styles.area]}
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Cole o texto ou importe .txt com placeholders, ex.: Nome: {{LOCADOR_NOME_RAZAO}}"
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <AppButton
          title="Importar template (.txt)"
          variant="ghost"
          onPress={() => void importFromTxt()}
        />
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
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  hint: { fontSize: 12, color: "#94a3b8", marginBottom: 10, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  area: {
    minHeight: 220,
    textAlignVertical: "top",
  },
  err: { color: "#dc2626", marginTop: 10, marginBottom: 6 },
});

