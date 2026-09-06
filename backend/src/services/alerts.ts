import { prisma } from "../db.js";
import { publishAlert } from "../realtime.js";

export async function createAlert(eventId: string, market: string, message: string) {
  const alert = await prisma.alert.create({ data: { eventId, market, message } });
  publishAlert(eventId, { id: alert.id, market: alert.market, message: alert.message, createdAt: alert.createdAt });
  return alert;
}

export async function listAlerts(eventId: string) {
  return prisma.alert.findMany({ where: { eventId }, orderBy: { createdAt: "desc" } });
}
