import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MarketBlock } from "../../services/api";

// Bloque reutilizable: cada mercado de apuestas (1X2, over/under, córners,
// tarjetas...) se renderiza como su propio panel, en vez de una tabla
// genérica de "estadísticas". Ver docs/market-mapping.md.
export function MarketPanel({ marketKey, block }: { marketKey: string; block: MarketBlock }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{block.label}</Text>
      {Object.entries(block.data).map(([key, value]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{humanize(key)}</Text>
          <Text style={styles.value}>{value === null || value === undefined ? "—" : String(value)}</Text>
        </View>
      ))}
    </View>
  );
}

function humanize(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#12161c",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  title: { color: "#ffffff", fontSize: 15, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: "#9aa4b2", fontSize: 13 },
  value: { color: "#ffffff", fontSize: 13, fontWeight: "500" },
});
