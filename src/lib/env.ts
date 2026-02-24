export const env = {
  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-this",
};

export function assertEnv() {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET is required");
}
