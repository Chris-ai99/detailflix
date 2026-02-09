import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { getWorkspaceIdFromCookies } from "./auth";
import { ensureWorkspaceDatabase, getWorkspaceDatabaseUrl } from "./tenant-db";

type PrismaGlobal = {
  clients?: Map<string, PrismaClient>;
  initializedWorkspaces?: Set<string>;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function getClientMap(): Map<string, PrismaClient> {
  if (!globalForPrisma.clients) {
    globalForPrisma.clients = new Map<string, PrismaClient>();
  }
  return globalForPrisma.clients;
}

function getInitializedWorkspaceSet(): Set<string> {
  if (!globalForPrisma.initializedWorkspaces) {
    globalForPrisma.initializedWorkspaces = new Set<string>();
  }
  return globalForPrisma.initializedWorkspaces;
}

function getSharedClient(): PrismaClient {
  const map = getClientMap();
  const key = "__shared__";
  const existing = map.get(key);
  if (existing) return existing;

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    timeout: 10_000,
  });
  const client = new PrismaClient({ adapter, log: ["error", "warn"] });
  map.set(key, client);
  return client;
}

function getWorkspaceClient(workspaceId: string): PrismaClient {
  const map = getClientMap();
  const key = `ws:${workspaceId}`;
  const existing = map.get(key);
  if (existing) return existing;

  // Schema sync only once per workspace process lifetime.
  const initialized = getInitializedWorkspaceSet();
  if (!initialized.has(workspaceId)) {
    ensureWorkspaceDatabase(workspaceId);
    initialized.add(workspaceId);
  }

  const adapter = new PrismaBetterSqlite3({
    url: getWorkspaceDatabaseUrl(workspaceId),
    timeout: 10_000,
  });
  const client = new PrismaClient({ adapter, log: ["error", "warn"] });
  map.set(key, client);
  return client;
}

async function getActiveClient(): Promise<PrismaClient> {
  const workspaceId = await getWorkspaceIdFromCookies();
  if (!workspaceId) return getSharedClient();
  return getWorkspaceClient(workspaceId);
}

function createModelProxy(modelName: string) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        return async (...args: unknown[]) => {
          const client = await getActiveClient();
          const model = (client as unknown as Record<string, unknown>)[modelName] as Record<
            string,
            (...fnArgs: unknown[]) => Promise<unknown>
          >;
          const method = model[prop];
          if (typeof method !== "function") {
            throw new Error(`Prisma model method not found: ${modelName}.${prop}`);
          }
          return method.apply(model, args);
        };
      },
    }
  );
}

export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;

      if (prop.startsWith("$")) {
        return async (...args: unknown[]) => {
          const client = await getActiveClient();
          const method = (client as unknown as Record<string, unknown>)[prop] as
            | ((...fnArgs: unknown[]) => Promise<unknown>)
            | undefined;
          if (typeof method !== "function") {
            throw new Error(`Prisma client method not found: ${prop}`);
          }
          return method.apply(client, args);
        };
      }

      return createModelProxy(prop);
    },
  }
) as unknown as PrismaClient;
