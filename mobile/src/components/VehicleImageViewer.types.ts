import type { ReactNode } from "react";

export type VehicleImageViewerProps = {
  images: { uri: string }[];
  imageIndex: number;
  visible: boolean;
  onRequestClose: () => void;
  onImageIndexChange: (index: number) => void;
  /** Rodapé opcional (ex.: excluir foto). No nativo, repassado ao ImageViewing. */
  renderFooter?: (state: { imageIndex: number }) => ReactNode;
};
