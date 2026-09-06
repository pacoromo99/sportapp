import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { listAlerts } from "../services/alerts.js";
import { buildGamesMarket, buildSetsMarket } from "../services/tennisMarkets.js";

export async function eventRoutes(app: FastifyInstance) {
  // GET /v1/events/:id
  app.get<{ Params: { id: string } }>("/v1/events/:id", async (req, reply) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { homeTeam: true, awayTeam: true, competition: true },
    });
    if (!event) return reply.code(404).send({ error: "event_not_found" });
    return event;
  });

  // GET /v1/events/:id/stats
  // Devuelve las estadísticas agrupadas por mercado (ver docs/market-mapping.md),
  // en vez de una lista plana — así el cliente renderiza un MarketPanel por bloque
  // sin tener que conocer la lógica de qué dato pertenece a qué mercado.
  // El módulo de deporte (fútbol/tenis) decide qué mercados existen; el núcleo
  // (Event) y el endpoint son los mismos para ambos.
  app.get<{ Params: { id: string } }>("/v1/events/:id/stats", async (req, reply) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { competition: true },
    });
    if (!event) return reply.code(404).send({ error: "event_not_found" });

    const markets =
      event.competition.sport === "tennis"
        ? await buildTennisMarkets(event.id)
        : await buildFootballMarkets(event);

    if (!markets) return reply.code(404).send({ error: "stats_not_found" });
    return { eventId: event.id, markets };
  });

  // GET /v1/events/:id/alerts — historial de alertas contextuales,
  // para pintar el feed al entrar a MatchDetail (antes de que lleguen
  // nuevas por WebSocket).
  app.get<{ Params: { id: string } }>("/v1/events/:id/alerts", async (req) => {
    return listAlerts(req.params.id);
  });
}

async function buildFootballMarkets(event: { id: string; homeScore: number; awayScore: number; homeScoreHT: number | null; awayScoreHT: number | null }) {
  const [stats, goals] = await Promise.all([
    prisma.footballEventStats.findUnique({ where: { eventId: event.id } }),
    prisma.goal.findMany({ where: { eventId: event.id }, orderBy: { minute: "asc" } }),
  ]);
  if (!stats) return null;

  return {
    ht_ft: {
      label: "Descanso / Final (HT-FT)",
      data: {
        halftime: `${event.homeScoreHT ?? "?"}-${event.awayScoreHT ?? "?"}`,
        fulltime: `${event.homeScore}-${event.awayScore}`,
      },
    },
    goalscorer: {
      label: "Primer goleador / anytime scorer",
      data:
        goals.length > 0
          ? Object.fromEntries(goals.map((g, i) => [`gol_${i + 1}`, `${g.minute}' ${g.player} (${g.type})`]))
          : { info: "Sin goles todavía" },
    },
    "1x2": {
      label: "1X2 / Doble oportunidad",
      data: { homePossession: stats.homePossession, awayPossession: stats.awayPossession },
    },
    over_under: {
      label: "Over/Under goles",
      data: {
        homeXg: stats.homeXg,
        awayXg: stats.awayXg,
        combinedXg:
          stats.homeXg != null && stats.awayXg != null ? Number((stats.homeXg + stats.awayXg).toFixed(2)) : null,
      },
    },
    corners: {
      label: "Córners",
      data: { homeCorners: stats.homeCorners, awayCorners: stats.awayCorners },
    },
    cards: {
      label: "Tarjetas",
      data: {
        homeYellowCards: stats.homeYellowCards,
        awayYellowCards: stats.awayYellowCards,
        homeRedCards: stats.homeRedCards,
        awayRedCards: stats.awayRedCards,
        referee: stats.referee,
      },
    },
  };
}

async function buildTennisMarkets(eventId: string) {
  const [sets, stats] = await Promise.all([
    prisma.tennisSet.findMany({ where: { eventId }, orderBy: { setNumber: "asc" } }),
    prisma.tennisEventStats.findUnique({ where: { eventId } }),
  ]);
  if (sets.length === 0 && !stats) return null;

  return {
    match_winner: { label: "Ganador del partido", data: buildSetsMarket(sets) },
    total_games: { label: "Total de juegos (over/under)", data: buildGamesMarket(sets) },
    set_betting: {
      label: "Ganador de set",
      data: Object.fromEntries(sets.map((s) => [`set_${s.setNumber}`, `${s.homeGames}-${s.awayGames}`])),
    },
    serve_props: {
      label: "Rendimiento al saque",
      data: stats
        ? {
            homeAces: stats.homeAces,
            awayAces: stats.awayAces,
            homeDoubleFaults: stats.homeDoubleFaults,
            awayDoubleFaults: stats.awayDoubleFaults,
            homeFirstServeInPct: stats.homeFirstServeInPct,
            awayFirstServeInPct: stats.awayFirstServeInPct,
          }
        : { info: "Sin estadísticas de saque todavía" },
    },
  };
}
