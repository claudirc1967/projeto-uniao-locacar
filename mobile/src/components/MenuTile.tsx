import { Pressable, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

export type MenuTileProps = {
  title: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  /** Quando true, ocupa a largura inteira (linha de destaque). */
  fullWidth?: boolean;
};

export function MenuTile({
  title,
  subtitle,
  icon,
  onPress,
  fullWidth,
}: MenuTileProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outer,
        fullWidth && styles.outerFull,
        {
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.inner}>
        <Icon source={icon} size={28} color={theme.colors.primary} />
        <View style={styles.textBlock}>
          <Text variant="titleSmall" style={styles.title} numberOfLines={2}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 16,
    minHeight: 104,
    flex: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  outerFull: {
    flex: 0,
    alignSelf: "stretch",
    width: "100%",
    minHeight: 112,
  },
  inner: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    alignItems: "flex-start",
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
