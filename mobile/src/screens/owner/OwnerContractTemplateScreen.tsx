import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
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
import { useAuth } from "../../hooks/AuthContext";
import type { RootStackParamList } from "../../navigation/types";
import { appAlert } from "../../utils/appAlert";
import { trpcErrorMessage } from "../../utils/trpcError";

type Props = NativeStackScreenProps<RootStackParamList, "OwnerContractTemplate">;

export function OwnerContractTemplateScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
      appAlert("Template importado", "Texto do contrato carregado com sucesso.");
    } catch (e) {
      if (uri) {
        try {
          const resp = await fetch(uri);
          const txt = await resp.text();
          if (txt.trim()) {
            setText(txt);
            appAlert(
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
        <Text variant="headlineSmall" style={styles.title}>
          Modelo de contrato
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {`Use placeholders no formato {{CHAVE}}. Ex.: {{LOCADOR_NOME_RAZAO}}, {{VEICULO_PLACA}}, {{LOCATARIO_CPF}}.`}
        </Text>

        <TextInput
          mode="outlined"
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Cole o texto ou importe .txt com placeholders, ex.: Nome: {{LOCADOR_NOME_RAZAO}}"
          style={styles.area}
        />

        <HelperText type="error" visible={!!err}>
          {err ?? ""}
        </HelperText>

        <Button
          mode="outlined"
          icon="file-import-outline"
          onPress={() => void importFromTxt()}
          style={styles.btn}
        >
          Importar template (.txt)
        </Button>
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
  title: { marginBottom: 8 },
  hint: { marginBottom: 10, lineHeight: 18, opacity: 0.85 },
  area: {
    minHeight: 220,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  btn: { marginTop: 8 },
});
