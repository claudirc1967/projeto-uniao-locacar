import { useEffect, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { trpc } from "../api/trpc";
import { cepDigits, maskCep } from "../utils/masks";
import { trpcErrorMessage } from "../utils/trpcError";
import { AppButton } from "./AppButton";

export type CepAddressValue = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  complemento: string;
};

type Props = {
  value: CepAddressValue;
  onChange: (v: CepAddressValue) => void;
  onNumeroFocus?: () => void;
  onComplementoFocus?: () => void;
};

export function CepAddressForm({
  value,
  onChange,
  onNumeroFocus,
  onComplementoFocus,
}: Props) {
  const [cepError, setCepError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const utils = trpc.useUtils();
  const digits = cepDigits(value.cep);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const h = e.endCoordinates?.height ?? 0;
      // Em alguns devices/ROMs `endCoordinates.height` pode vir como 0.
      // Usamos um fallback para evitar que "Número/Complemento" fiquem escondidos.
      setKeyboardPad(h > 0 ? h : 250);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const buscarCep = async () => {
    setCepError(null);
    if (digits.length !== 8) {
      setCepError("Informe um CEP com 8 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const data = await utils.address.lookupCep.fetch({ cep: digits });
      onChange({
        ...value,
        cep: maskCep(digits),
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,
      });
    } catch (e) {
      setCepError(trpcErrorMessage(e, "Não foi possível buscar o CEP."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.block, { paddingBottom: 8 + keyboardPad }]}>
      <Text style={styles.label}>CEP</Text>
      <TextInput
        style={styles.input}
        placeholder="00000-000"
        keyboardType="number-pad"
        value={value.cep}
        onChangeText={(t) => onChange({ ...value, cep: maskCep(t) })}
      />
      {cepError ? <Text style={styles.err}>{cepError}</Text> : null}
      <AppButton
        title={loading ? "Buscando…" : "Buscar CEP"}
        variant="ghost"
        onPress={buscarCep}
        disabled={loading}
        loading={loading}
      />

      <Text style={styles.label}>Logradouro</Text>
      <TextInput
        style={[styles.input, styles.readonly]}
        value={value.logradouro}
        editable={false}
        placeholder="Preenchido pelo CEP"
      />
      <Text style={styles.label}>Bairro</Text>
      <TextInput
        style={[styles.input, styles.readonly]}
        value={value.bairro}
        editable={false}
      />
      <Text style={styles.label}>Cidade / UF</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.city]}
          value={value.cidade}
          editable={false}
        />
        <TextInput
          style={[styles.input, styles.uf]}
          value={value.uf}
          editable={false}
        />
      </View>
      <Text style={styles.label}>Número</Text>
      <TextInput
        style={styles.input}
        value={value.numero}
        onChangeText={(numero) => onChange({ ...value, numero })}
        onFocus={() => onNumeroFocus?.()}
        placeholder="Número"
      />
      <Text style={styles.label}>Complemento</Text>
      <TextInput
        style={styles.input}
        value={value.complemento}
        onChangeText={(complemento) => onChange({ ...value, complemento })}
        onFocus={() => onComplementoFocus?.()}
        placeholder="Opcional"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  label: { fontSize: 13, color: "#475569", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  readonly: { backgroundColor: "#f8fafc", color: "#64748b" },
  row: { flexDirection: "row", gap: 8 },
  city: { flex: 1 },
  uf: { width: 56, textAlign: "center" },
  err: { color: "#dc2626", fontSize: 13, marginTop: 4 },
});
