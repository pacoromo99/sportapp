// Subconjunto de la respuesta de API-Football (v3) que realmente usamos.
// Referencia: https://www.api-football.com/documentation-v3 — endpoint /fixtures
// No modelamos el payload completo a propósito: si el proveedor cambia o
// añadimos otro (Sportmonks), solo cambia este archivo + normalize.ts.

export type RawFixture = {
  fixture: {
    id: number;
    date: string; // ISO
    status: { short: string; elapsed: number | null }; // "NS" | "1H" | "2H" | "HT" | "FT"...
    referee: string | null;
  };
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
  };
};

export type RawFixtureEvent = {
  time: { elapsed: number };
  team: { id: number };
  player: { name: string };
  type: string; // "Goal" | "Card" | ...
  detail: string; // "Normal Goal" | "Penalty" | "Own Goal" | "Yellow Card" | "Red Card"
};

export type RawFixtureStatistics = {
  team: { id: number };
  statistics: { type: string; value: number | string | null }[];
};

// Estado normalizado que usamos internamente.
export type CanonicalStatus = "scheduled" | "live" | "finished";

export function normalizeStatus(short: string): CanonicalStatus {
  if (["NS", "TBD", "PST"].includes(short)) return "scheduled";
  if (["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(short)) return "finished";
  return "live"; // 1H, HT, 2H, ET, BT, P...
}
