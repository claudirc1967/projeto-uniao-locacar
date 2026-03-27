import { useEffect, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { trpc } from "../api/trpc";
import { cepDigits, maskCep } from "../utils/masks";
import { trpcErrorMessage } from "../utils/trpcError";

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
  locked?: boolean;
};

export function CepAddressForm({
  value,
  onChange,
  onNumeroFocus,
  onComplementoFocus,
  locked = false,
}: Props) {
  const [cepError, setCepError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const utils = trpc.useUtils();
  const digits = cepDigits(value.cep);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const h = e.endCoordinates?.height ?? 0;
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

  useEffect(() => {
    if (locked) setCepError(null);
  }, [locked]);

  const buscarCep = async () => {
    if (locked) return;
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

  const readOnlyProps = {
    mode: "outlined" as const,
    editable: false,
    style: styles.field,
  };

  return (
    <View style={[styles.block, { paddingBottom: 8 + keyboardPad }]}>
      <TextInput
        mode="outlined"
        label="CEP"
        placeholder="00000-000"
        keyboardType="number-pad"
        value={value.cep}
        editable={!locked}
        onChangeText={(t) => onChange({ ...value, cep: maskCep(t) })}
        style={styles.field}
      />
      <HelperText type="error" visible={!!cepError}>
        {cepError ?? ""}
      </HelperText>
      <Button
        mode="outlined"
        onPress={buscarCep}
        disabled={locked || loading}
        loading={loading}
        style={styles.buscarBtn}
      >
        Buscar CEP
      </Button>

      <TextInput
        {...readOnlyProps}
        label="Logradouro"
        placeholder="Preenchido pelo CEP"
        value={value.logradouro}
      />
      <TextInput {...readOnlyProps} label="Bairro" value={value.bairro} />
      <View style={styles.row}>
        <TextInput
          {...readOnlyProps}
          label="Cidade"
          value={value.cidade}
          style={[styles.field, styles.city]}
        />
        <TextInput
          {...readOnlyProps}
          label="UF"
          value={value.uf}
          style={[styles.field, styles.uf]}
        />
      </View>
      <TextInput
        mode="outlined"
        label="Número"
        value={value.numero}
        editable={!locked}
        onChangeText={(numero) => onChange({ ...value, numero })}
        onFocus={() => onNumeroFocus?.()}
        placeholder="Número"
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="Complemento"
        value={value.complemento}
        editable={!locked}
        onChangeText={(complemento) => onChange({ ...value, complemento })}
        onFocus={() => onComplementoFocus?.()}
        placeholder="Opcional"
        style={styles.field}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
  field: { marginBottom: 4, backgroundColor: "#fff" },
  buscarBtn: { marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  city: { flex: 1 },
  uf: { width: 72 },
});
