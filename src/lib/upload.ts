import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function saveUpload(file: File, folder: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "") || ".bin";
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const relDir = path.join("uploads", folder);
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, filename);
  await writeFile(absPath, bytes);
  return `/${relDir}/${filename}`;
}
