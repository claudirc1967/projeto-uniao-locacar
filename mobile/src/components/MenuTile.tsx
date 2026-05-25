import { Pressable, StyleSheet, View } from "react-native";
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

  return (
    <Pressable
      onPress={onPress}
      style={[styles.pressable, fullWidth && styles.pressableFull]}
    >
      {({ pressed }) => (
        <Surface
          style={[
            styles.outer,
            fullWidth && styles.outerFull,
            { opacity: pressed ? 0.92 : 1 },
          ]}
          elevation={2}
        >
          <View style={styles.inner}>
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
          </View>
        </Surface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  pressableFull: {
    flex: 0,
    alignSelf: "stretch",
    width: "100%",
  },
  outer: {
    borderRadius: 16,
    minHeight: 104,
    flex: 1,
  },
  outerFull: {
    minHeight: 112,
  },
  inner: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
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
