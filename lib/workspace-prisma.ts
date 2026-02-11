import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { ensureWorkspaceDatabase, getWorkspaceDatabaseUrl } from "./tenant-db";

const SQLITE_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.SQLITE_TIMEOUT_MS ?? "2000");
  if (!Number.isFinite(parsed) || parsed <= 0) return 2000;
  return Math.trunc(parsed);
})();

type WorkspacePrismaGlobal = {
  clients?: Map<string, PrismaClient>;
};

const globalForWorkspacePrisma = globalThis as unknown as WorkspacePrismaGlobal;

function normalizeWorkspaceId(value: string): string {
  const workspaceId = String(value ?? "").trim();
  if (!workspaceId || !/^[a-zA-Z0-9_-]+$/.test(workspaceId)) {
    throw new Error("Ungueltige Workspace-ID");
  }
  return workspaceId;
}

function getClientMap(): Map<string, PrismaClient> {
  if (!globalForWorkspacePrisma.clients) {
    globalForWorkspacePrisma.clients = new Map<string, PrismaClient>();
  }
  return globalForWorkspacePrisma.clients;
}

export function getWorkspacePrismaClient(workspaceIdRaw: string): PrismaClient {
  const workspaceId = normalizeWorkspaceId(workspaceIdRaw);
  const map = getClientMap();
  const existing = map.get(workspaceId);
  if (existing) return existing;

  ensureWorkspaceDatabase(workspaceId);

  const adapter = new PrismaBetterSqlite3({
    url: getWorkspaceDatabaseUrl(workspaceId),
    timeout: SQLITE_TIMEOUT_MS,
  });

  const client = new PrismaClient({ adapter, log: ["error", "warn"] });
  map.set(workspaceId, client);
  return client;
}
