import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ATTACHMENTS_ROOT = path.join(process.cwd(), "data", "customer-attachments");

function normalizeId(value: string, label: string): string {
  const id = value.trim();
  if (!id) throw new Error(`${label} fehlt`);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`${label} ist ungueltig`);
  }
  return id;
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  const ext = path.extname(trimmed).toLowerCase().slice(0, 12);
  const base = path.basename(trimmed, ext).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `${base || "dokument"}${ext}`;
}

export function resolveAttachmentAbsolutePath(storagePath: string): string {
  const root = path.resolve(ATTACHMENTS_ROOT);
  const full = path.resolve(root, storagePath);
  if (!full.startsWith(`${root}${path.sep}`)) {
    throw new Error("Ungueltiger Dateipfad");
  }
  return full;
}

export async function storeCustomerAttachmentFile(input: {
  workspaceId: string;
  customerId: string;
  originalName: string;
  content: Buffer;
}): Promise<{ storagePath: string; fileName: string }> {
  const workspaceId = normalizeId(input.workspaceId, "Workspace-ID");
  const customerId = normalizeId(input.customerId, "Kunden-ID");
  const safeName = sanitizeFileName(input.originalName || "dokument");
  const uniquePrefix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const fileName = `${uniquePrefix}-${safeName}`;
  const storagePath = path.join(workspaceId, customerId, fileName);
  const absolutePath = resolveAttachmentAbsolutePath(storagePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.content);

  return { storagePath, fileName: safeName };
}

export async function deleteAttachmentFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(resolveAttachmentAbsolutePath(storagePath));
  } catch {
    // already removed or missing on disk
  }
}
