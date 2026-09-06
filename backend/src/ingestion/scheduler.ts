import { apiFootball } from "./apiFootballClient.js";
import { upsertFixture } from "./upsertFixture.js";
import { checkUpcomingLineups } from "./upsertLineups.js";

// Ligas que seguimos en Fase 0 (LaLiga + LaLiga2 como ejemplo — ajustar a
// las ligas España/Latam del ángulo de nicho recomendado en el informe).
const FOLLOWED_LEAGUE_IDS = (process.env.FOLLOWED_LEAGUE_IDS ?? "140").split(",");

const LIVE_POLL_INTERVAL_MS = 25_000;
const LINEUP_POLL_INTERVAL_MS = 5 * 60_000; // las alineaciones no cambian minuto a minuto

let liveTimer: ReturnType<typeof setInterval> | null = null;
let lineupTimer: ReturnType<typeof setInterval> | null = null;

async function pollLiveFixtures() {
  try {
    const fixtures = await apiFootball.liveFixtures(FOLLOWED_LEAGUE_IDS);
    for (const fixture of fixtures) {
      const [events, statistics] = await Promise.all([
        apiFootball.fixtureEvents(fixture.fixture.id),
        apiFootball.fixtureStatistics(fixture.fixture.id),
      ]);
      await upsertFixture(fixture, events, statistics);
    }
  } catch (err) {
    console.error("[ingestion] error sondeando partidos en vivo:", err);
  }
}

async function pollUpcomingLineups() {
  try {
    await checkUpcomingLineups();
  } catch (err) {
    console.error("[ingestion] error sondeando alineaciones:", err);
  }
}

// Arranca el Ingestion Service. Si no hay API_FOOTBALL_KEY, se queda
// desactivado y el backend sigue sirviendo lo que ya haya en la base de
// datos (útil para desarrollo local con el seed).
export function startIngestion() {
  if (!process.env.API_FOOTBALL_KEY) {
    console.log("[ingestion] API_FOOTBALL_KEY no configurada — Ingestion Service desactivado");
    return;
  }

  console.log(`[ingestion] arrancando sondeo cada ${LIVE_POLL_INTERVAL_MS / 1000}s para ligas ${FOLLOWED_LEAGUE_IDS}`);
  pollLiveFixtures();
  liveTimer = setInterval(pollLiveFixtures, LIVE_POLL_INTERVAL_MS);

  pollUpcomingLineups();
  lineupTimer = setInterval(pollUpcomingLineups, LINEUP_POLL_INTERVAL_MS);
}

export function stopIngestion() {
  if (liveTimer) clearInterval(liveTimer);
  if (lineupTimer) clearInterval(lineupTimer);
}
