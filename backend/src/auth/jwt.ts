import jwt, { type SignOptions } from "jsonwebtoken";

const secret = process.env.JWT_SECRET ?? "dev-insecure-secret";

export type JwtPayload = {
  sub: string;
  email: string;
  role: "OWNER" | "DRIVER" | "ADMIN";
};

export function signJwt(
  payload: JwtPayload,
  expiresIn: SignOptions["expiresIn"] = "7d"
) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
