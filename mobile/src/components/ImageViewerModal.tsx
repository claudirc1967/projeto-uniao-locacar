import type { ReactNode } from "react";
import { useCallback } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { IconButton, Text } from "react-native-paper";

export function ImageViewerModal({
  images,
  imageIndex,
  visible,
  onRequestClose,
  onImageIndexChange,
  renderFooter,
}: {
  images: { uri: string }[];
  imageIndex: number;
  visible: boolean;
  onRequestClose: () => void;
  onImageIndexChange: (index: number) => void;
  renderFooter?: (state: { imageIndex: number }) => ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const current = images[imageIndex];
  const canPrev = imageIndex > 0;
  const canNext = imageIndex < images.length - 1;

  const goPrev = useCallback(() => {
    if (canPrev) onImageIndexChange(imageIndex - 1);
  }, [canPrev, imageIndex, onImageIndexChange]);

  const goNext = useCallback(() => {
    if (canNext) onImageIndexChange(imageIndex + 1);
  }, [canNext, imageIndex, onImageIndexChange]);

  if (!current) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={[styles.root, { width, height }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
        <View style={styles.header} pointerEvents="box-none">
          <IconButton icon="close" iconColor="#fff" onPress={onRequestClose} />
        </View>
        <View style={styles.imageWrap} pointerEvents="box-none">
          <Image
            source={current}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel="Foto ampliada"
          />
        </View>
        {renderFooter || images.length > 1 ? (
          <View style={styles.bottomSection} pointerEvents="box-none">
            {renderFooter ? (
              <View style={styles.customFooterInner}>{renderFooter({ imageIndex })}</View>
            ) : null}
            {images.length > 1 ? (
              <View style={styles.pagerRow}>
                <IconButton
                  icon="chevron-left"
                  iconColor="#fff"
                  disabled={!canPrev}
                  onPress={goPrev}
                />
                <Text style={styles.counter}>
                  {imageIndex + 1} / {images.length}
                </Text>
                <IconButton
                  icon="chevron-right"
                  iconColor="#fff"
                  disabled={!canNext}
                  onPress={goNext}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  imageWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 16,
    zIndex: 2,
    alignItems: "center",
  },
  customFooterInner: {
    width: "100%",
    alignItems: "center",
  },
  pagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 8,
  },
  counter: {
    color: "#fff",
    fontSize: 14,
    minWidth: 56,
    textAlign: "center",
  },
});
