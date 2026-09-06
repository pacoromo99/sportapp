import { prisma } from "../db.js";
import { publishEventUpdate } from "../realtime.js";
import { createAlert } from "../services/alerts.js";
import { pickStatValue } from "./statValue.js";
import { normalizeStatus, type RawFixture, type RawFixtureEvent, type RawFixtureStatistics } from "./types.js";

// Normaliza + escribe un fixture de API-Football en el modelo canónico.
// Idempotente por externalId: se puede llamar en cada ciclo del scheduler
// sin duplicar filas.
export async function upsertFixture(
  raw: RawFixture,
  events: RawFixtureEvent[] = [],
  statistics: RawFixtureStatistics[] = [],
) {
  const competition = await prisma.competition.upsert({
    where: { externalId: String(raw.league.id) },
    create: {
      externalId: String(raw.league.id),
      name: raw.league.name,
      country: raw.league.country,
      sport: "football",
      season: String(raw.league.season),
    },
    update: { season: String(raw.league.season) },
  });

  const homeTeam = await upsertTeam(raw.teams.home.id, raw.teams.home.name);
  const awayTeam = await upsertTeam(raw.teams.away.id, raw.teams.away.name);

  const status = normalizeStatus(raw.fixture.status.short);

  const existing = await prisma.event.findUnique({ where: { externalId: String(raw.fixture.id) } });

  const event = await prisma.event.upsert({
    where: { externalId: String(raw.fixture.id) },
    create: {
      externalId: String(raw.fixture.id),
      competitionId: competition.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      kickoff: new Date(raw.fixture.date),
      status,
      minute: raw.fixture.status.elapsed,
      homeScore: raw.goals.home ?? 0,
      awayScore: raw.goals.away ?? 0,
      homeScoreHT: raw.score.halftime.home,
      awayScoreHT: raw.score.halftime.away,
    },
    update: {
      status,
      minute: raw.fixture.status.elapsed,
      homeScore: raw.goals.home ?? 0,
      awayScore: raw.goals.away ?? 0,
      homeScoreHT: raw.score.halftime.home,
      awayScoreHT: raw.score.halftime.away,
    },
  });

  await upsertGoals(
    event.id,
    events,
    homeTeam.externalId!,
    awayTeam.externalId!,
    homeTeam.id,
    awayTeam.id,
    homeTeam.name,
    awayTeam.name,
  );

  const statsPatch = await upsertStatistics(
    event.id,
    statistics,
    raw.fixture.referee,
    homeTeam.id,
    awayTeam.id,
    homeTeam.name,
    awayTeam.name,
  );

  // Solo difundimos si de verdad cambió algo relevante para un cliente ya
  // conectado (evita ruido de WebSocket en cada ciclo de sondeo).
  const changed =
    !existing ||
    existing.status !== status ||
    existing.minute !== raw.fixture.status.elapsed ||
    existing.homeScore !== (raw.goals.home ?? 0) ||
    existing.awayScore !== (raw.goals.away ?? 0);

  if (changed) {
    publishEventUpdate(event.id, {
      status: { data: { status, minute: raw.fixture.status.elapsed, homeScore: event.homeScore, awayScore: event.awayScore } },
      ...statsPatch,
    });
  }

  return event;
}

async function upsertTeam(externalId: number, name: string) {
  return prisma.team.upsert({
    where: { externalId: String(externalId) },
    create: { externalId: String(externalId), name, country: "", sport: "football" },
    update: { name },
  });
}

async function upsertGoals(
  eventId: string,
  events: RawFixtureEvent[],
  homeExternalId: string,
  awayExternalId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeTeamName: string,
  awayTeamName: string,
) {
  const goalEvents = events.filter((e) => e.type === "Goal");
  if (goalEvents.length === 0) return;

  const previousGoals = await prisma.goal.findMany({ where: { eventId } });
  const wasKnown = (g: RawFixtureEvent) =>
    previousGoals.some((p) => p.minute === g.time.elapsed && p.player === g.player.name);
  const newGoals = goalEvents.filter((g) => !wasKnown(g));

  // Estrategia simple para el MVP: recreamos los goles del fixture en cada
  // ciclo. Con pocos goles por partido el coste es despreciable; en Fase 2
  // se puede pasar a upsert por (eventId, minute, player) si hace falta.
  await prisma.goal.deleteMany({ where: { eventId } });
  await prisma.goal.createMany({
    data: goalEvents.map((g) => ({
      eventId,
      teamId: String(g.team.id) === homeExternalId ? homeTeamId : awayTeamId,
      minute: g.time.elapsed,
      player: g.player.name,
      type: g.detail === "Penalty" ? "penalty" : g.detail === "Own Goal" ? "own_goal" : "open_play",
    })),
  });

  // Alerta contextual: un gol cambia al instante el precio de over/under,
  // 1X2 y el mercado de goleador — el momento exacto en que el apostador
  // necesita reaccionar (ver "Datos que impulsan la apuesta").
  for (const g of newGoals) {
    const teamName = String(g.team.id) === homeExternalId ? homeTeamName : awayTeamName;
    await createAlert(eventId, "goalscorer", `⚽ Gol de ${g.player.name} (${teamName}), min. ${g.time.elapsed}'`);
  }
}

async function upsertStatistics(
  eventId: string,
  statistics: RawFixtureStatistics[],
  referee: string | null,
  homeTeamId: string,
  awayTeamId: string,
  homeTeamName: string,
  awayTeamName: string,
) {
  if (statistics.length < 2) return {};

  const previous = await prisma.footballEventStats.findUnique({ where: { eventId } });
  const [homeStats, awayStats] = statistics;

  const data = {
    homePossession: pickStatValue(homeStats.statistics, "Ball Possession"),
    awayPossession: pickStatValue(awayStats.statistics, "Ball Possession"),
    homeShotsOnGoal: pickStatValue(homeStats.statistics, "Shots on Goal"),
    awayShotsOnGoal: pickStatValue(awayStats.statistics, "Shots on Goal"),
    homeCorners: pickStatValue(homeStats.statistics, "Corner Kicks"),
    awayCorners: pickStatValue(awayStats.statistics, "Corner Kicks"),
    homeYellowCards: pickStatValue(homeStats.statistics, "Yellow Cards"),
    awayYellowCards: pickStatValue(awayStats.statistics, "Yellow Cards"),
    homeRedCards: pickStatValue(homeStats.statistics, "Red Cards"),
    awayRedCards: pickStatValue(awayStats.statistics, "Red Cards"),
    referee,
  };

  await prisma.footballEventStats.upsert({
    where: { eventId },
    create: { eventId, ...data },
    update: data,
  });

  // Alerta contextual: una roja cambia de golpe el mercado de tarjetas y
  // el 1X2 (el equipo pasa a jugar con uno menos).
  if ((data.homeRedCards ?? 0) > (previous?.homeRedCards ?? 0)) {
    await createAlert(eventId, "cards", `🟥 Tarjeta roja para ${homeTeamName}`);
  }
  if ((data.awayRedCards ?? 0) > (previous?.awayRedCards ?? 0)) {
    await createAlert(eventId, "cards", `🟥 Tarjeta roja para ${awayTeamName}`);
  }

  return {
    corners: { data: { homeCorners: data.homeCorners, awayCorners: data.awayCorners } },
    cards: {
      data: {
        homeYellowCards: data.homeYellowCards,
        awayYellowCards: data.awayYellowCards,
        homeRedCards: data.homeRedCards,
        awayRedCards: data.awayRedCards,
        referee: data.referee,
      },
    },
  };
}
