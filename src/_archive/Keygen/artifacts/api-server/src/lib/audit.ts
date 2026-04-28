import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

export async function writeAuditLog(params: {
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ?? {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch {
  }
}
