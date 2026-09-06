import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export async function searchRoutes(app: FastifyInstance) {
  // GET /v1/search?q=betis — equipos y competiciones, para la pantalla Search
  app.get<{ Querystring: { q?: string } }>("/v1/search", async (req) => {
    const q = (req.query.q ?? "").trim();
    if (q.length < 2) return { teams: [], competitions: [] };

    const [teams, competitions] = await Promise.all([
      prisma.team.findMany({
        where: { name: { contains: q } },
        take: 15,
        select: { id: true, name: true, country: true, sport: true },
      }),
      prisma.competition.findMany({
        where: { name: { contains: q } },
        take: 10,
        select: { id: true, name: true, country: true, sport: true },
      }),
    ]);

    return { teams, competitions };
  });
}
