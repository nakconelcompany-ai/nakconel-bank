import { prisma } from './prisma';

export async function writeAudit(params: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        meta: params.meta ?? {},
        ip: params.ip,
      },
    });
  } catch (e) {
    console.error('[audit] failed', e);
  }
}
