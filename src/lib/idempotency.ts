import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const TTL_HOURS = 24;

export async function withIdempotency<T>(
  key: string | null | undefined,
  handler: () => Promise<T>
): Promise<{ data: T; replayed: boolean }> {
  if (!key) {
    const data = await handler();
    return { data, replayed: false };
  }

  const existing = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (existing && existing.expiresAt > new Date()) {
    return { data: existing.response as T, replayed: true };
  }

  const data = await handler();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);

  await prisma.idempotencyRecord.upsert({
    where: { key },
    create: {
      key,
      response: data as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      response: data as Prisma.InputJsonValue,
      expiresAt,
    },
  });

  return { data, replayed: false };
}
