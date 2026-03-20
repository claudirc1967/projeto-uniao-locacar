import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";

type Props = TouchableOpacityProps & {
  title: string;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
};

export function AppButton({
  title,
  loading,
  variant = "primary",
  disabled,
  style,
  ...rest
}: Props) {
  const dim = Boolean(disabled || loading);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[
        styles.btn,
        variant === "primary" && styles.primary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        dim && styles.dim,
        style,
      ]}
      disabled={dim}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#2563eb" : "#fff"} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "ghost" && styles.textGhost,
            variant === "danger" && styles.textDanger,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primary: { backgroundColor: "#2563eb" },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  danger: { backgroundColor: "#dc2626" },
  dim: { opacity: 0.55 },
  text: { color: "#fff", fontWeight: "600", fontSize: 16 },
  textGhost: { color: "#2563eb" },
  textDanger: { color: "#fff" },
});
