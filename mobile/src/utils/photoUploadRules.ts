export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(mime: string | undefined | null): mime is AllowedImageType {
  return (
    !!mime &&
    (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime)
  );
}

export function validatePhotosForUpload(
  metas: { uri: string; mime: string | undefined; size: number }[]
): { ok: true } | { ok: false; message: string } {
  if (metas.length < 1 || metas.length > 6) {
    return {
      ok: false,
      message: "Selecione entre 1 e 6 fotos.",
    };
  }
  for (const m of metas) {
    if (!isAllowedImageType(m.mime)) {
      return {
        ok: false,
        message: "Use apenas JPEG, PNG ou WebP.",
      };
    }
    if (!Number.isFinite(m.size) || m.size <= 0) {
      return {
        ok: false,
        message: "Não foi possível ler o tamanho de uma das fotos. Tente novamente.",
      };
    }
    if (m.size > MAX_PHOTO_BYTES) {
      return {
        ok: false,
        message: "Cada foto deve ter no máximo 5 MB.",
      };
    }
  }
  return { ok: true };
}
