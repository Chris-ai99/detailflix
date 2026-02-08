import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { getSessionFromCookies } from "./auth";
import { ensureWorkspaceDatabase, getWorkspaceDatabaseUrl } from "./tenant-db";

type PrismaGlobal = {
  clients?: Map<string, PrismaClient>;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function getClientMap(): Map<string, PrismaClient> {
  if (!globalForPrisma.clients) {
    globalForPrisma.clients = new Map<string, PrismaClient>();
  }
  return globalForPrisma.clients;
}

function getSharedClient(): PrismaClient {
  const map = getClientMap();
  const key = "__shared__";
  const existing = map.get(key);
  if (existing) return existing;

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
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

  ensureWorkspaceDatabase(workspaceId);
  const adapter = new PrismaBetterSqlite3({
    url: getWorkspaceDatabaseUrl(workspaceId),
  });
  const client = new PrismaClient({ adapter, log: ["error", "warn"] });
  map.set(key, client);
  return client;
}

async function getActiveClient(): Promise<PrismaClient> {
  const session = await getSessionFromCookies();
  if (!session) return getSharedClient();
  return getWorkspaceClient(session.workspaceId);
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
