import { prisma } from "../db.js";
import { calculateForm, calculateHeadToHead } from "./formCalculations.js";

// TeamForm no es una tabla — se calcula sobre los últimos N partidos
// finalizados del equipo. Ver docs/market-mapping.md: alimenta 1X2,
// over/under y BTTS sin necesitar un campo nuevo del proveedor.
export async function computeTeamForm(teamId: string, lastN = 10) {
  const events = await prisma.event.findMany({
    where: {
      status: "finished",
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { kickoff: "desc" },
    take: lastN,
  });

  return { teamId, ...calculateForm(events, teamId) };
}

// Head-to-head: últimos enfrentamientos directos entre dos equipos,
// en cualquier orden local/visitante.
export async function computeHeadToHead(teamId: string, otherTeamId: string, lastN = 10) {
  const events = await prisma.event.findMany({
    where: {
      status: "finished",
      OR: [
        { homeTeamId: teamId, awayTeamId: otherTeamId },
        { homeTeamId: otherTeamId, awayTeamId: teamId },
      ],
    },
    orderBy: { kickoff: "desc" },
    take: lastN,
    include: { homeTeam: true, awayTeam: true },
  });

  return {
    ...calculateHeadToHead(events, teamId),
    matches: events.map((e) => ({
      id: e.id,
      kickoff: e.kickoff,
      homeTeam: e.homeTeam.name,
      awayTeam: e.awayTeam.name,
      homeScore: e.homeScore,
      awayScore: e.awayScore,
    })),
  };
}
