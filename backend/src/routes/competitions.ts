import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export async function competitionRoutes(app: FastifyInstance) {
  // GET /v1/competitions
  app.get("/v1/competitions", async () => {
    return prisma.competition.findMany({
      select: { id: true, name: true, country: true, sport: true, season: true },
    });
  });

  // GET /v1/competitions/:id/events?date=YYYY-MM-DD
  app.get<{ Params: { id: string }; Querystring: { date?: string } }>(
    "/v1/competitions/:id/events",
    async (req) => {
      const { id } = req.params;
      const { date } = req.query;

      const where: any = { competitionId: id };
      if (date) {
        const start = new Date(`${date}T00:00:00.000Z`);
        const end = new Date(`${date}T23:59:59.999Z`);
        where.kickoff = { gte: start, lte: end };
      }

      return prisma.event.findMany({
        where,
        orderBy: { kickoff: "asc" },
        include: { homeTeam: true, awayTeam: true },
      });
    },
  );
}
