// Cliente WebSocket con reconexión simple para partidos en vivo.
// Se suscribe a un event_id concreto al entrar en MatchDetail.
const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_BASE_URL ?? "ws://localhost:3000";

export type LiveUpdate = { type: "update"; eventId: string; patch: Record<string, unknown> };
export type LiveAlert = {
  type: "alert";
  eventId: string;
  alert: { id: string; market: string; message: string; createdAt: string };
};
export type LiveMessage = LiveUpdate | LiveAlert;

export function subscribeToLiveEvent(
  eventId: string,
  onMessage: (message: LiveMessage) => void,
): () => void {
  let socket: WebSocket | null = null;
  let closedByClient = false;

  const connect = () => {
    socket = new WebSocket(`${WS_BASE_URL}/v1/live/${eventId}`);

    socket.onmessage = (msg) => {
      try {
        onMessage(JSON.parse(msg.data as string) as LiveMessage);
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = () => {
      // Reconexión: al reconectar, la pantalla debe volver a pedir el
      // snapshot vía REST (api.eventStats/api.alerts) antes de fiarse de
      // los deltas, para no quedar inconsistente tras el corte.
      if (!closedByClient) setTimeout(connect, 2000);
    };
  };

  connect();

  return () => {
    closedByClient = true;
    socket?.close();
  };
}
