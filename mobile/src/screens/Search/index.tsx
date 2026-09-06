import React, { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { api, SearchResult } from "../../services/api";

const SPORT_ICON: Record<string, string> = { football: "⚽", tennis: "🎾" };

export function SearchScreen({ navigation }: { navigation: any }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult>({ teams: [], competitions: [] });

  async function onChange(text: string) {
    setQuery(text);
    if (text.trim().length < 2) {
      setResult({ teams: [], competitions: [] });
      return;
    }
    setResult(await api.search(text));
  }

  const items = [
    ...result.competitions.map((c) => ({ ...c, kind: "competition" as const })),
    ...result.teams.map((t) => ({ ...t, kind: "team" as const })),
  ];

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Buscar equipo o competición..."
        placeholderTextColor="#5a6472"
        value={query}
        onChangeText={onChange}
        autoFocus
      />
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        renderItem={({ item }) => {
          const icon = "sport" in item ? SPORT_ICON[item.sport] ?? "🏆" : undefined;
          // Una competición lleva a sus partidos. Un equipo, de momento, solo
          // se muestra como resultado informativo — no hay todavía un
          // endpoint de "próximos partidos de este equipo" en el backend.
          if (item.kind === "competition") {
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate("LiveMatches", { competitionId: item.id, title: item.name })}
              >
                <View style={styles.nameRow}>
                  {icon && <Text style={styles.icon}>{icon}</Text>}
                  <Text style={styles.name}>{item.name}</Text>
                </View>
                <Text style={styles.kind}>Competición ›</Text>
              </Pressable>
            );
          }
          return (
            <View style={[styles.row, styles.rowDisabled]}>
              <View style={styles.nameRow}>
                {icon && <Text style={styles.icon}>{icon}</Text>}
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <Text style={styles.kind}>Equipo</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070a", padding: 14 },
  input: {
    backgroundColor: "#12161c",
    color: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomColor: "#1c2128",
    borderBottomWidth: 1,
  },
  rowDisabled: { opacity: 0.6 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  icon: { fontSize: 13, marginRight: 6 },
  name: { color: "#ffffff", fontSize: 14 },
  kind: { color: "#5a6472", fontSize: 12 },
});
