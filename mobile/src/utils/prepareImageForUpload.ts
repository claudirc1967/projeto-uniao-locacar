import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";
import { getUriByteSize } from "./imageUriToBlob";
import { MAX_PHOTO_BYTES } from "./photoUploadRules";

/** Lado maior máximo após redimensionamento (px). */
export const MAX_IMAGE_SIDE_PX = 1920;

const JPEG_QUALITIES = [0.8, 0.6, 0.45] as const;
const OUTPUT_MIME = "image/jpeg" as const;

export type PreparedImage = {
  uri: string;
  mime: typeof OUTPUT_MIME;
  size: number;
};

function getImageSize(
  uri: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

function resizeActions(
  width: number,
  height: number
): ImageManipulator.Action[] {
  if (width <= MAX_IMAGE_SIDE_PX && height <= MAX_IMAGE_SIDE_PX) {
    return [];
  }
  if (width >= height) {
    return [{ resize: { width: MAX_IMAGE_SIDE_PX } }];
  }
  return [{ resize: { height: MAX_IMAGE_SIDE_PX } }];
}

/**
 * Redimensiona (se necessário), converte para JPEG e comprime até caber em MAX_PHOTO_BYTES.
 */
export async function prepareImageForUpload(uri: string): Promise<PreparedImage> {
  let width = MAX_IMAGE_SIDE_PX + 1;
  let height = MAX_IMAGE_SIDE_PX;
  try {
    const dims = await getImageSize(uri);
    width = dims.width;
    height = dims.height;
  } catch {
    // Sem dimensões: aplica resize conservador por largura.
  }

  const actions = resizeActions(width, height);
  let lastUri = uri;
  let lastSize = 0;

  for (const compress of JPEG_QUALITIES) {
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    lastUri = result.uri;
    lastSize = await getUriByteSize(result.uri);
    if (lastSize <= MAX_PHOTO_BYTES) {
      return { uri: lastUri, mime: OUTPUT_MIME, size: lastSize };
    }
  }

  if (lastSize > MAX_PHOTO_BYTES) {
    const mb = (lastSize / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Não foi possível reduzir a foto abaixo de 5 MB (ficou ~${mb} MB). Escolha outra imagem.`
    );
  }

  return { uri: lastUri, mime: OUTPUT_MIME, size: lastSize };
}

export async function prepareImagesForUpload(
  uris: string[]
): Promise<PreparedImage[]> {
  const out: PreparedImage[] = [];
  for (const uri of uris) {
    out.push(await prepareImageForUpload(uri));
  }
  return out;
}
