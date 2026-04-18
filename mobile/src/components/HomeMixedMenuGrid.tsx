import { StyleSheet, View } from "react-native";
import { MenuTile, type MenuTileProps } from "./MenuTile";

export type HomeMenuItem = Pick<
  MenuTileProps,
  "title" | "subtitle" | "icon" | "onPress"
> & { key: string };

type Props = {
  /** Bloco em largura total no topo (ex.: ação principal). */
  featured: HomeMenuItem;
  /** Demais itens em grade de duas colunas. */
  items: HomeMenuItem[];
  /**
   * Se true, coloca o destaque e o primeiro item na mesma linha (duas colunas),
   * útil para ganhar espaço vertical na tela inicial.
   */
  pairFeaturedWithFirst?: boolean;
};

function chunkPairs<T>(list: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2));
  }
  return rows;
}

export function HomeMixedMenuGrid({
  featured,
  items,
  pairFeaturedWithFirst,
}: Props) {
  const first = pairFeaturedWithFirst ? items[0] : undefined;
  const gridItems = pairFeaturedWithFirst && first ? items.slice(1) : items;
  const rows = chunkPairs(gridItems);

  return (
    <View style={styles.root}>
      {pairFeaturedWithFirst && first ? (
        <View style={styles.row}>
          <View style={styles.cell}>
            <MenuTile
              title={featured.title}
              subtitle={featured.subtitle}
              icon={featured.icon}
              onPress={featured.onPress}
            />
          </View>
          <View style={styles.cell}>
            <MenuTile
              title={first.title}
              subtitle={first.subtitle}
              icon={first.icon}
              onPress={first.onPress}
            />
          </View>
        </View>
      ) : (
        <MenuTile
          title={featured.title}
          subtitle={featured.subtitle}
          icon={featured.icon}
          onPress={featured.onPress}
          fullWidth
        />
      )}

      <View style={styles.grid}>
        {rows.map((pair, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {pair.map((item) => (
              <View key={item.key} style={styles.cell}>
                <MenuTile
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  onPress={item.onPress}
                />
              </View>
            ))}
            {pair.length === 1 ? <View style={styles.cell} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
});
