import type { FastifyInstance } from "fastify";
import { EventEmitter } from "node:events";

// Bus de eventos en memoria para el MVP. En producción (Fase 1+), sustituir
// por Redis pub/sub para que el WebSocket server escale horizontalmente
// (ver arquitectura: "el pub/sub vive en Redis, no en memoria de proceso").
export const liveBus = new EventEmitter();

const UPDATE_CHANNEL = (eventId: string) => `update:${eventId}`;
const ALERT_CHANNEL = (eventId: string) => `alert:${eventId}`;

export function publishEventUpdate(eventId: string, patch: Record<string, unknown>) {
  liveBus.emit(UPDATE_CHANNEL(eventId), patch);
}

// Alertas contextuales: gol, tarjeta roja, alineación confirmada... el
// momento exacto en que el apostador necesita reaccionar (ver "Datos que
// impulsan la apuesta"). Van en un canal separado de los deltas de
// estadísticas para que el cliente pueda mostrarlas como notificaciones
// puntuales en vez de mezclarlas con el estado continuo del partido.
export function publishAlert(eventId: string, alert: Record<string, unknown>) {
  liveBus.emit(ALERT_CHANNEL(eventId), alert);
}

export async function realtimeRoutes(app: FastifyInstance) {
  app.get("/v1/live/:eventId", { websocket: true }, (connection, req) => {
    const { eventId } = req.params as { eventId: string };

    const onUpdate = (patch: Record<string, unknown>) => {
      connection.socket.send(JSON.stringify({ type: "update", eventId, patch }));
    };
    const onAlert = (alert: Record<string, unknown>) => {
      connection.socket.send(JSON.stringify({ type: "alert", eventId, alert }));
    };

    liveBus.on(UPDATE_CHANNEL(eventId), onUpdate);
    liveBus.on(ALERT_CHANNEL(eventId), onAlert);

    connection.socket.on("close", () => {
      liveBus.off(UPDATE_CHANNEL(eventId), onUpdate);
      liveBus.off(ALERT_CHANNEL(eventId), onAlert);
    });
  });
}
