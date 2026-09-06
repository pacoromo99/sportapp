import { prisma } from "../db.js";
import { createAlert } from "../services/alerts.js";
import { apiFootball } from "./apiFootballClient.js";

// Comprueba si el proveedor ya publicó alineaciones para partidos que
// arrancan pronto. Se llama desde el scheduler por separado del sondeo de
// partidos en vivo (las alineaciones suelen aparecer ~1h antes del kickoff,
// no hace falta sondearlas cada 25s).
export async function checkUpcomingLineups(withinMinutes = 90) {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinMinutes * 60_000);

  const upcoming = await prisma.event.findMany({
    where: { status: "scheduled", kickoff: { gte: now, lte: horizon }, externalId: { not: null } },
    include: { homeTeam: true, awayTeam: true, lineups: true },
  });

  for (const event of upcoming) {
    if (event.lineups.length > 0) continue; // ya confirmadas, no repetir la alerta

    try {
      const lineups = await apiFootball.fixtureLineups(Number(event.externalId));
      if (lineups.length === 0) continue; // el proveedor aún no las ha publicado

      for (const lineup of lineups) {
        const teamId = String(lineup.team.id) === event.homeTeam.externalId ? event.homeTeamId : event.awayTeamId;
        await prisma.lineup.createMany({
          data: lineup.startXI.map((p) => ({
            eventId: event.id,
            teamId,
            player: p.player.name,
            position: p.player.pos,
            isStarter: true,
          })),
        });
      }

      await createAlert(
        event.id,
        "1x2",
        `📋 Alineaciones confirmadas: ${event.homeTeam.name} vs ${event.awayTeam.name}`,
      );
    } catch (err) {
      console.error(`[ingestion] error comprobando alineaciones del evento ${event.id}:`, err);
    }
  }
}
