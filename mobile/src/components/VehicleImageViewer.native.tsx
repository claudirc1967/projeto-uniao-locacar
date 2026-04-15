import ImageViewing from "react-native-image-viewing";
import type { FC } from "react";
import type { VehicleImageViewerProps } from "./VehicleImageViewer.types";

const VehicleImageViewer: FC<VehicleImageViewerProps> = (props) => (
  <ImageViewing
    images={props.images}
    imageIndex={props.imageIndex}
    visible={props.visible}
    onRequestClose={props.onRequestClose}
    onImageIndexChange={props.onImageIndexChange}
    doubleTapToZoomEnabled
    swipeToCloseEnabled
    presentationStyle="overFullScreen"
    FooterComponent={
      props.renderFooter
        ? ({ imageIndex }) => <>{props.renderFooter!({ imageIndex })}</>
        : undefined
    }
  />
);

export default VehicleImageViewer;
