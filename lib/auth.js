import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "token";
const encoder = new TextEncoder();

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Configure it in your .env file.");
  }
  return encoder.encode(secret);
}

export async function signToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch (err) {
    return null;
  }
}

export { COOKIE_NAME };

// Reads + verifies the auth cookie from a Next.js Request object (App Router)
export async function getAuthFromRequest(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload; // { sub, name, email, role } or null
}

// Throws a Response-friendly error object when auth/role checks fail.
export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth(req, allowedRoles = []) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    throw new AuthError("Not authenticated", 401);
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(auth.role)) {
    throw new AuthError("Not authorized for this action", 403);
  }
  return auth;
}
