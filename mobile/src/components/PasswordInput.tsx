import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

type Props = Omit<TextInputProps, "secureTextEntry"> & {
  /** default true — oculta a senha até o usuário tocar no ícone */
  defaultHidden?: boolean;
};

export function PasswordInput({
  style,
  defaultHidden = true,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(defaultHidden);

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        {...rest}
        style={styles.input}
        secureTextEntry={hidden}
        textContentType="password"
        autoComplete="password"
      />
      <Pressable
        style={styles.eye}
        onPress={() => setHidden((h) => !h)}
        accessibilityRole="button"
        accessibilityLabel={hidden ? "Mostrar senha" : "Ocultar senha"}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={hidden ? "eye-outline" : "eye-off-outline"}
          size={22}
          color="#64748b"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eye: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
