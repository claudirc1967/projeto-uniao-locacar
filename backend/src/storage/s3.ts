import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const region = process.env.AWS_REGION ?? "sa-east-1";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

function requireBucket() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (bucket && bucket.trim().length > 0) return bucket;
  throw new Error(
    "Storage S3 não configurado. Defina no backend (.env) a variável AWS_S3_BUCKET."
  );
}

function client() {
  return new S3Client({ region });
}

export function buildVehiclePhotoKey(vehicleId: string, fileName?: string) {
  const safe = (fileName ?? "photo").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `vehicles/${vehicleId}/${randomUUID()}-${safe}`;
}

export function buildRentalInspectionPhotoKey(
  rentalId: string,
  type: "CHECKOUT" | "CHECKIN",
  fileName?: string
) {
  const safe = (fileName ?? "photo").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `rentals/${rentalId}/inspections/${type}/${randomUUID()}-${safe}`;
}

export async function presignPutUpload(
  key: string,
  contentType: AllowedContentType
) {
  const bucket = requireBucket();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUrl(client(), cmd, { expiresIn: 900 });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Falha ao gerar presigned PUT.";
    throw new Error(
      `Falha ao gerar URL assinada de upload. Verifique credenciais/endpoint AWS (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) ou use o credential chain do ambiente. Detalhe: ${msg}`
    );
  }
  return { uploadUrl, bucket, key };
}

export async function presignGetRead(key: string, expiresIn = 3600) {
  const bucket = requireBucket();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  try {
    return await getSignedUrl(client(), cmd, { expiresIn });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Falha ao gerar presigned GET.";
    throw new Error(
      `Falha ao gerar URL assinada de leitura. Verifique credenciais/endpoint AWS (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) ou use o credential chain do ambiente. Detalhe: ${msg}`
    );
  }
}

export async function presignGetMany(keys: string[], expiresIn = 3600) {
  const out: Record<string, string> = {};
  await Promise.all(
    keys.map(async (key) => {
      out[key] = await presignGetRead(key, expiresIn);
    })
  );
  return out;
}

export async function deleteObject(key: string): Promise<void> {
  const bucket = requireBucket();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function putObjectBuffer(params: {
  key: string;
  contentType: string;
  body: Uint8Array | Buffer;
}): Promise<{ bucket: string; key: string }> {
  const bucket = requireBucket();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
      Body: params.body,
    })
  );
  return { bucket, key: params.key };
}
