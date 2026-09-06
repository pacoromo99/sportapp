# Mapa dato → mercado (fútbol)

Referenciado desde `backend/prisma/schema.prisma`. Cada campo del modelo de
datos debe poder trazarse a un mercado de apuestas real (ver el documento de
producto "Datos que impulsan la apuesta"). Esta tabla es la fuente de verdad
para priorizar qué capturar del proveedor de datos primero.

| Mercado | Campos que lo alimentan | Entidad / endpoint |
|---|---|---|
| 1X2 / doble oportunidad | forma reciente (últimos 5-10), racha local/visitante, H2H | `TeamForm` (calculado), `GET /v1/teams/:id/form`, `GET /v1/teams/:id/vs/:otherId` |
| Hándicap asiático/europeo | xG por equipo, posesión | `FootballEventStats.homeXg/awayXg/homePossession/awayPossession` |
| Over/Under goles | xG combinado, media de goles reciente | `FootballEventStats.homeXg/awayXg`, `TeamForm.avgGoalsFor/avgGoalsAgainst` |
| Ambos marcan (BTTS) | % partidos con ambos marcando, goles encajados | `TeamForm.bttsRate`, `avgGoalsAgainst` |
| Córners | media de córners a favor/en contra | `FootballEventStats.homeCorners/awayCorners` |
| Tarjetas | media de tarjetas, árbitro asignado | `FootballEventStats.home/awayYellowCards`, `home/awayRedCards`, `referee` |
| Resultado exacto / HT-FT | marcador al descanso, distribución histórica | `Event.homeScoreHT/awayScoreHT`, `Goal[]` |
| Primer goleador / anytime scorer | minuto y jugador de cada gol, posición | `Goal.minute/player/team` |

## Tenis (Fase 2 — segundo deporte)

Reutiliza el núcleo canónico sin cambios: un `Team` es aquí un jugador
individual, y `Event.homeScore`/`awayScore` representan **sets ganados**, no
goles — por eso `computeTeamForm`/`computeHeadToHead` (misma lógica que en
fútbol) funcionan igual para tenis sin tocar código, solo cambia qué
significa el marcador.

| Mercado | Campos que lo alimentan | Entidad / endpoint |
|---|---|---|
| Ganador del partido | ranking, forma reciente, H2H | `Team.ranking`, `GET /v1/teams/:id/form`, `GET /v1/teams/:id/vs/:otherId` |
| Hándicap de sets/juegos | juegos por set, breaks convertidos | `TennisSet.homeGames/awayGames`, `TennisEventStats.home/awayBreakPointsWon` |
| Total de juegos (over/under) | juegos acumulados, % de tie-breaks | `TennisSet[]` (sumar `homeGames+awayGames`, contar `wasTiebreak`) |
| Ganador de set / primer set | resultado de `TennisSet` por número de set, superficie | `TennisSet`, `Event.surface` |
| Rendimiento al saque (prop) | aces, dobles faltas, % primer saque | `TennisEventStats.home/awayAces`, `homeDoubleFaults`, `homeFirstServeInPct` |

`Event.surface` (clay/hard/grass) es el dato que convierte "forma reciente"
en "forma reciente en esta superficie" — sin él, el panel 1X2 de tenis sería
engañoso (un jugador puede ir bien en pista dura y mal en tierra batida).

## Prioridad de captura (Fase 0-1)

1. `Event` + `FootballEventStats` básicos (ya en el esquema inicial) — cubre 1X2 aproximado, over/under, córners, tarjetas.
2. `Goal` — desbloquea HT/FT y primer goleador, los dos mercados más apostados en fútbol después del 1X2.
3. `TeamForm` (calculado, no ingerido) — se deriva de los últimos N `Event` de un equipo; no requiere un campo nuevo del proveedor, solo una consulta agregada.
4. `Lineup` — nice-to-have para Fase 2 (alineaciones probables, minutos jugados de un jugador de cara a anytime scorer).

## Convención

Al añadir un campo nuevo a `FootballEventStats` o al módulo de un deporte
futuro, añade una fila aquí antes de mergear — si un dato no puede
justificarse por un mercado real, probablemente no merece la pena capturarlo
todavía (ver "Principios de diseño" en el documento de arquitectura).
