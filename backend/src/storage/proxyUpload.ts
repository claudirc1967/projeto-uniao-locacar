import type { Request, Response } from "express";
import { verifyJwt } from "../auth/jwt.js";
import { prisma } from "../db.js";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  putObjectBuffer,
} from "./s3.js";

const allowedContentTypes = new Set<string>(ALLOWED_CONTENT_TYPES);

function bearerUserId(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  try {
    return verifyJwt(header.slice(7)).sub;
  } catch {
    return null;
  }
}

function queryString(req: Request, name: string): string {
  const v = req.query[name];
  return typeof v === "string" ? v.trim() : "";
}

function readBody(req: Request): Buffer | null {
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) return null;
  if (body.length > MAX_UPLOAD_BYTES) return null;
  return body;
}

function contentType(req: Request): string | null {
  const ct = req.headers["content-type"];
  if (typeof ct !== "string" || !allowedContentTypes.has(ct)) return null;
  return ct;
}

export async function handleVehiclePhotoProxyUpload(
  req: Request,
  res: Response
): Promise<void> {
  const userId = bearerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const vehicleId = queryString(req, "vehicleId");
  const key = queryString(req, "key");
  const ct = contentType(req);
  const body = readBody(req);

  if (!vehicleId || !key || !ct || !body) {
    res.status(400).json({ error: "Parâmetros ou corpo inválidos" });
    return;
  }

  const expectedPrefix = `vehicles/${vehicleId}/`;
  if (!key.startsWith(expectedPrefix)) {
    res.status(400).json({ error: "Key inválida para este veículo" });
    return;
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId: userId },
    select: { id: true },
  });
  if (!vehicle) {
    res.status(404).json({ error: "Veículo não encontrado" });
    return;
  }

  try {
    await putObjectBuffer({
      key,
      contentType: ct,
      body: new Uint8Array(body),
    });
    res.status(204).end();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload";
    res.status(500).json({ error: msg });
  }
}

export async function handleRentalInspectionPhotoProxyUpload(
  req: Request,
  res: Response
): Promise<void> {
  const userId = bearerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const rentalId = queryString(req, "rentalId");
  const type = queryString(req, "type");
  const key = queryString(req, "key");
  const ct = contentType(req);
  const body = readBody(req);

  if (!rentalId || !key || !ct || !body) {
    res.status(400).json({ error: "Parâmetros ou corpo inválidos" });
    return;
  }

  if (type !== "CHECKOUT" && type !== "CHECKIN") {
    res.status(400).json({ error: "type deve ser CHECKOUT ou CHECKIN" });
    return;
  }

  const expectedPrefix = `rentals/${rentalId}/inspections/${type}/`;
  if (!key.startsWith(expectedPrefix)) {
    res.status(400).json({ error: "Key inválida para esta vistoria" });
    return;
  }

  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, vehicle: { ownerUserId: userId } },
    select: { id: true },
  });
  if (!rental) {
    res.status(404).json({ error: "Locação não encontrada" });
    return;
  }

  try {
    await putObjectBuffer({
      key,
      contentType: ct,
      body: new Uint8Array(body),
    });
    res.status(204).end();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload";
    res.status(500).json({ error: msg });
  }
}
