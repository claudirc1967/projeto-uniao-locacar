import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Text } from "react-native-paper";

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
  return (
    <ImageViewing
      images={images}
      imageIndex={imageIndex}
      visible={visible}
      onRequestClose={onRequestClose}
      onImageIndexChange={onImageIndexChange}
      doubleTapToZoomEnabled
      swipeToCloseEnabled
      presentationStyle="overFullScreen"
      FooterComponent={({ imageIndex: currentIndex }) => (
        <View style={styles.footer}>
          {renderFooter ? renderFooter({ imageIndex: currentIndex }) : null}
          {images.length > 1 ? (
            <Text style={styles.counter}>
              {currentIndex + 1} / {images.length}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 16,
  },
  counter: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
    minWidth: 56,
    textAlign: "center",
  },
});
