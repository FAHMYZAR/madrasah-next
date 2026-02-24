import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "madrasah-secret-key-change-in-production";

export interface AuthUser {
  sub: string;
  nim: string;
  name: string;
  role: "admin" | "guru" | "user";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: { _id: string; nim: string; name: string; role: string }): string {
  return jwt.sign(
    { sub: user._id, nim: user.nim, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export async function getAuth(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const auth = await getAuth();
  if (!auth) throw new Error("UNAUTHORIZED");
  return auth;
}

export async function requireAdmin(): Promise<AuthUser> {
  const auth = await requireAuth();
  if (auth.role !== "admin") throw new Error("FORBIDDEN");
  return auth;
}

export async function requireAdminOrGuru(): Promise<AuthUser> {
  const auth = await requireAuth();
  if (auth.role !== "admin" && auth.role !== "guru") throw new Error("FORBIDDEN");
  return auth;
}

export async function setSession(user: { _id: string; nim: string; name: string; role: string }) {
  const token = generateToken(user);
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}

export { User };
