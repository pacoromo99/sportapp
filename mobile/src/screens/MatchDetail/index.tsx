import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { api, EventStats, MatchEvent, TeamForm, HeadToHead } from "../../services/api";
import { subscribeToLiveEvent } from "../../services/socket";
import { MarketPanel } from "../../components/MarketPanel";

type AlertItem = { id: string; market: string; message: string; createdAt: string };

// Pantalla clave del objetivo de producto: en vez de una pestaña
// "Estadísticas" genérica, cada bloque responde a un mercado de apuestas
// concreto (1X2, over/under, córners, tarjetas, HT-FT, goleador...), y las
// alertas contextuales avisan del momento exacto en que algo relevante
// cambió (gol, roja, alineación confirmada).
export function MatchDetailScreen({ route }: { route: any }) {
  const { eventId } = route.params as { eventId: string };
  const [stats, setStats] = useState<EventStats | null>(null);
  const [oneXTwo, setOneXTwo] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    // 1. Snapshot inicial vía REST (estadísticas, forma/H2H y alertas ya emitidas).
    api.eventStats(eventId).then(setStats).catch(() => setStats(null));
    api.alerts(eventId).then(setAlerts).catch(() => setAlerts([]));
    api
      .event(eventId)
      .then((event) => loadOneXTwoPanel(event))
      .catch(() => setOneXTwo(null));

    // 2. Suscripción a deltas y alertas en vivo. Al reconectar, se vuelve a
    // pedir el snapshot completo (ver services/socket.ts) para no quedar
    // inconsistente tras un corte.
    const unsubscribe = subscribeToLiveEvent(eventId, (message) => {
      if (message.type === "update") {
        setStats((prev) => (prev ? { ...prev, markets: { ...prev.markets, ...(message.patch as any) } } : prev));
      } else if (message.type === "alert") {
        setAlerts((prev) => [message.alert as AlertItem, ...prev]);
      }
    });

    return unsubscribe;
  }, [eventId]);

  async function loadOneXTwoPanel(event: MatchEvent) {
    const [homeForm, awayForm, h2h] = await Promise.all([
      api.teamForm(event.homeTeam.id),
      api.teamForm(event.awayTeam.id),
      api.headToHead(event.homeTeam.id, event.awayTeam.id),
    ]);
    setOneXTwo(formatOneXTwo(event, homeForm, awayForm, h2h));
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14 }}>
      {alerts.length > 0 && (
        <View style={styles.alertsBox}>
          {alerts.slice(0, 5).map((a) => (
            <Text key={a.id} style={styles.alertText}>
              {a.message}
            </Text>
          ))}
        </View>
      )}
      {/* Forma/H2H es agnóstica de deporte: compara "a favor" vs "en contra"
          sobre homeScore/awayScore, sean goles (fútbol) o sets (tenis). */}
      {oneXTwo && <MarketPanel marketKey="1x2_form" block={{ label: "Forma reciente y H2H", data: oneXTwo }} />}
      {Object.entries(stats.markets).map(([key, block]) => (
        <MarketPanel key={key} marketKey={key} block={block} />
      ))}
    </ScrollView>
  );
}

function formatOneXTwo(event: MatchEvent, home: TeamForm, away: TeamForm, h2h: HeadToHead) {
  return {
    [`Forma ${event.homeTeam.name}`]: home.form.join("") || "—",
    [`Forma ${event.awayTeam.name}`]: away.form.join("") || "—",
    "Media goles local": home.avgGoalsFor,
    "Media goles visitante": away.avgGoalsFor,
    "H2H (local / empates / visitante)": `${h2h.teamWins} / ${h2h.draws} / ${h2h.otherWins}`,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070a" },
  center: { flex: 1, backgroundColor: "#05070a", justifyContent: "center", alignItems: "center" },
  alertsBox: {
    backgroundColor: "#1a1300",
    borderColor: "#5a4600",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  alertText: { color: "#ffd166", fontSize: 13, marginVertical: 2 },
});
