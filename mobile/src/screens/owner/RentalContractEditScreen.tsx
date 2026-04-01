import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RentalContractEdit">;

export function RentalContractEditScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { rentalId, initialContractText } = route.params;
  const [text, setText] = useState(initialContractText);

  const cancel = () => navigation.goBack();

  const save = () => {
    navigation.navigate("RentalInstructions", {
      rentalId,
      contractTextDraft: text,
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
        <Text variant="bodyMedium" style={styles.hint}>
          Ajuste o texto do contrato. As alterações só serão gravadas na locação
          quando você tocar em &quot;Salvar e ativar locação&quot; na tela
          anterior.
        </Text>
        <TextInput
          mode="outlined"
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Texto do contrato (opcional)…"
          style={styles.area}
        />
        <Button mode="contained" onPress={save} style={styles.saveBtn}>
          Salvar modificações
        </Button>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button mode="outlined" icon="arrow-left" onPress={cancel}>
          Cancelar
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 12 },
  hint: { marginBottom: 12, opacity: 0.85 },
  area: { minHeight: 280, backgroundColor: "#fff" },
  saveBtn: { marginTop: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
