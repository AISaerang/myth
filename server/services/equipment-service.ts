import "server-only";
import type { EquipmentStatus } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { EquipmentInput } from "@/lib/validation/operations";

export async function listEquipment(eventId: string, status?: EquipmentStatus) {
  return prisma.equipmentItem.findMany({
    where: { eventId, ...(status ? { status } : {}) },
    include: { assignee: { select: { id: true, displayName: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function createEquipment(
  actorUserId: string,
  input: EquipmentInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  if (input.assigneePersonId) {
    const assignee = await prisma.person.findUnique({
      where: { id: input.assigneePersonId },
    });
    if (!assignee || !assignee.isActive) {
      return { ok: false, error: "PIC harus personel aktif." };
    }
  }
  const item = await prisma.equipmentItem.create({
    data: {
      eventId: input.eventId,
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      status: input.status as EquipmentStatus,
      ownerOrSource: input.ownerOrSource || null,
      assigneePersonId: input.assigneePersonId,
      dueAt: input.dueAt ?? null,
      notes: input.notes || null,
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.EQUIPMENT_CREATED,
    entityType: "EquipmentItem",
    entityId: item.id,
    summary: `Item teknis "${item.name}" ditambahkan (${item.status}).`,
    metadata: { name: item.name, status: item.status },
  });
  return { ok: true, id: item.id };
}

export async function updateEquipment(
  actorUserId: string,
  id: string,
  input: Omit<EquipmentInput, "eventId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.equipmentItem.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Item tidak ditemukan." };
  if (input.assigneePersonId) {
    const assignee = await prisma.person.findUnique({
      where: { id: input.assigneePersonId },
    });
    if (!assignee || !assignee.isActive) {
      return { ok: false, error: "PIC harus personel aktif." };
    }
  }
  await prisma.equipmentItem.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      status: input.status as EquipmentStatus,
      ownerOrSource: input.ownerOrSource || null,
      assigneePersonId: input.assigneePersonId ?? null,
      dueAt: input.dueAt ?? null,
      notes: input.notes || null,
    },
  });
  // Perubahan status teknis penting dicatat (docs/01).
  if (input.status !== existing.status) {
    await writeAudit({
      actorUserId,
      action: AuditAction.EQUIPMENT_STATUS_CHANGED,
      entityType: "EquipmentItem",
      entityId: id,
      summary: `"${input.name}": ${existing.status} → ${input.status}.`,
      metadata: { name: input.name, from: existing.status, to: input.status },
    });
  }
  return { ok: true };
}
