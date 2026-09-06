import type { FastifyInstance } from "fastify";
import { computeTeamForm, computeHeadToHead } from "../services/form.js";

export async function teamRoutes(app: FastifyInstance) {
  // GET /v1/teams/:id/form — alimenta el panel 1X2/over-under/BTTS de MatchDetail
  app.get<{ Params: { id: string } }>("/v1/teams/:id/form", async (req) => {
    return computeTeamForm(req.params.id);
  });

  // GET /v1/teams/:id/vs/:otherId — enfrentamientos directos, mercado 1X2
  app.get<{ Params: { id: string; otherId: string } }>("/v1/teams/:id/vs/:otherId", async (req) => {
    return computeHeadToHead(req.params.id, req.params.otherId);
  });
}
