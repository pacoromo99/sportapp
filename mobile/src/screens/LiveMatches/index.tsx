import React, { useEffect, useState } from "react";
import { View, Text, SectionList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { api, MatchEvent } from "../../services/api";

type Competition = { id: string; name: string; country: string; sport: string };
type Section = { competition: Competition; data: MatchEvent[] };

const SPORT_ICON: Record<string, string> = { football: "⚽", tennis: "🎾" };

// Lista de partidos en vivo, agrupada por competición con una cabecera que
// deja claro de qué deporte es cada bloque — el núcleo canónico no
// distingue deporte a nivel de datos, pero la UI sí debe hacerlo visible
// (objetivo de producto: "ambos deportes" reconocibles de un vistazo).
// Si llega `route.params.competitionId`, filtra a una sola competición
// (usado desde el buscador).
export function LiveMatchesScreen({ navigation, route }: { navigation: any; route: any }) {
  const onlyCompetitionId: string | undefined = route?.params?.competitionId;
  const [sections, setSections] = useState<Section[] | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: route?.params?.title ?? "En vivo" });

    api
      .competitions()
      .then((comps) => (onlyCompetitionId ? comps.filter((c) => c.id === onlyCompetitionId) : comps))
      .then((comps) =>
        Promise.all(
          comps.map(async (c) => ({
            competition: c as Competition,
            data: await api.eventsForCompetition(c.id),
          })),
        ),
      )
      .then((all) => setSections(all.filter((s) => s.data.length > 0)))
      .catch(() => setSections([]));
  }, [onlyCompetitionId]);

  if (sections === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No hay partidos que mostrar todavía.</Text>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{SPORT_ICON[section.competition.sport] ?? "🏆"}</Text>
          <Text style={styles.sectionTitle}>{section.competition.name}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate("MatchDetail", { eventId: item.id })}
        >
          <Text style={styles.status}>{item.status === "live" ? `${item.minute ?? ""}'` : item.status}</Text>
          <View style={styles.teams}>
            <Text style={styles.team}>{item.homeTeam.name}</Text>
            <Text style={styles.team}>{item.awayTeam.name}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.score}>{item.homeScore}</Text>
            <Text style={styles.score}>{item.awayScore}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070a" },
  center: { flex: 1, backgroundColor: "#05070a", justifyContent: "center", alignItems: "center", padding: 24 },
  empty: { color: "#5a6472", fontSize: 14, textAlign: "center" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#05070a",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionIcon: { fontSize: 14, marginRight: 8 },
  sectionTitle: { color: "#9aa4b2", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: "#1c2128",
    borderBottomWidth: 1,
  },
  status: { color: "#ff5a5f", width: 48, fontSize: 12, fontWeight: "700" },
  teams: { flex: 1 },
  team: { color: "#ffffff", fontSize: 14, marginVertical: 2 },
  scoreBox: { alignItems: "flex-end" },
  score: { color: "#ffffff", fontSize: 14, fontWeight: "700", marginVertical: 2 },
});
