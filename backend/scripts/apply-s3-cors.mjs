/**
 * Aplica CORS no bucket S3 de fotos (upload direto pelo navegador).
 * Uso: cd backend && node --env-file=.env scripts/apply-s3-cors.mjs
 *
 * Requer AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (ou credential chain)
 * com permissão s3:PutBucketCors no bucket AWS_S3_BUCKET.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bucket = process.env.AWS_S3_BUCKET?.trim();
const region = process.env.AWS_REGION?.trim() || "sa-east-1";

if (!bucket) {
  console.error("Defina AWS_S3_BUCKET no .env");
  process.exit(1);
}

const cors = JSON.parse(
  readFileSync(join(__dirname, "s3-cors.json"), "utf8")
);

const client = new S3Client({ region });

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: cors,
  })
);

console.log(`CORS aplicado em s3://${bucket} (${region})`);
