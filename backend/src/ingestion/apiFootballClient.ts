import type { RawFixture, RawFixtureEvent, RawFixtureStatistics } from "./types.js";

export type RawLineup = {
  team: { id: number };
  startXI: { player: { name: string; pos: string } }[];
};

// Cliente mínimo contra API-Football. La clave se lee de env — sin ella el
// Ingestion Service no arranca (ver scheduler.ts), pero el resto del backend
// funciona igual sirviendo lo que ya haya en la base de datos.
const BASE_URL = "https://v3.football.api-sports.io";

function authHeaders() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY no configurada");
  return { "x-apisports-key": key };
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API-Football ${path} respondió ${res.status}`);

  const body = (await res.json()) as { response: T[] };
  return body.response;
}

export const apiFootball = {
  // Partidos en vivo de las ligas que seguimos (filtrar por liga evita
  // consumir cuota en partidos fuera de nuestro alcance de Fase 0-1).
  liveFixtures: (leagueIds: string[]) =>
    get<RawFixture>("/fixtures", { live: "all" }).then((fixtures) =>
      leagueIds.length ? fixtures.filter((f) => leagueIds.includes(String(f.league.id))) : fixtures,
    ),

  fixturesByDate: (leagueId: string, date: string, season: string) =>
    get<RawFixture>("/fixtures", { league: leagueId, date, season }),

  fixtureEvents: (fixtureId: number) => get<RawFixtureEvent>("/fixtures/events", { fixture: String(fixtureId) }),

  fixtureStatistics: (fixtureId: number) =>
    get<RawFixtureStatistics>("/fixtures/statistics", { fixture: String(fixtureId) }),

  // Vacío hasta que el proveedor las publica (normalmente ~1h antes del
  // kickoff) — el scheduler reintenta hasta que aparecen. Alimenta la
  // alerta "Alineación confirmada" (mercado 1X2 / anytime scorer).
  fixtureLineups: (fixtureId: number) => get<RawLineup>("/fixtures/lineups", { fixture: String(fixtureId) }),
};
