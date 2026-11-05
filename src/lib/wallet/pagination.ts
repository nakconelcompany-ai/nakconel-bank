export type LedgerCursor = {
  createdAt: string;
  id: string;
};

export function parseLedgerCursor(value: unknown): LedgerCursor | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid transaction cursor.");
  }
  const cursor = value as { createdAt?: unknown; id?: unknown };
  const createdAt = typeof cursor.createdAt === "string" ? cursor.createdAt : "";
  const id = typeof cursor.id === "string" ? cursor.id : "";
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp) || !id || id.length > 128) {
    throw new Error("Invalid transaction cursor.");
  }
  return { createdAt: new Date(timestamp).toISOString(), id };
}
