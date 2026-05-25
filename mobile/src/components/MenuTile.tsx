import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";

export type MenuTileProps = {
  title: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  /** Quando true, ocupa a largura inteira (linha de destaque). */
  fullWidth?: boolean;
  /** Cor do ícone e do título; se omitido, o ícone usa a cor primária do tema. */
  accentColor?: string;
};

export function MenuTile({
  title,
  subtitle,
  icon,
  onPress,
  fullWidth,
  accentColor,
}: MenuTileProps) {
  const theme = useTheme();
  const iconTint = accentColor ?? theme.colors.primary;
  const useFlatSurface = Platform.OS === "web";

  const tileBody = (
    <>
      <Icon source={icon} size={28} color={iconTint} />
      <View style={styles.textBlock}>
        <Text
          variant="titleSmall"
          style={[styles.title, accentColor ? { color: accentColor } : null]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="bodySmall"
            style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      style={fullWidth ? styles.pressableFull : styles.pressable}
    >
      {({ pressed }) =>
        useFlatSurface ? (
          <View
            style={[
              styles.outer,
              styles.webOuter,
              fullWidth && styles.outerFull,
              { opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <View style={styles.inner}>{tileBody}</View>
          </View>
        ) : (
          <Surface
            style={[
              styles.outer,
              fullWidth && styles.outerFull,
              { opacity: pressed ? 0.92 : 1 },
            ]}
            elevation={2}
          >
            <View style={styles.inner}>{tileBody}</View>
          </Surface>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
  },
  pressableFull: {
    alignSelf: "stretch",
    width: "100%",
  },
  outer: {
    borderRadius: 16,
    minHeight: 104,
    width: "100%",
  },
  outerFull: {
    minHeight: 112,
  },
  webOuter: {
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
      },
      default: {},
    }),
  },
  inner: {
    padding: 16,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    borderRadius: 16,
    overflow: "hidden",
  },
  textBlock: {
    marginTop: 12,
    width: "100%",
    gap: 2,
  },
  title: {
    fontWeight: "600",
  },
  sub: {
    lineHeight: 18,
  },
});
