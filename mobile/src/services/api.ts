// Cliente REST. En dev apunta a localhost; en builds de EAS se sustituye por
// EXPO_PUBLIC_API_BASE_URL (ver mobile/eas.json — el prefijo EXPO_PUBLIC_ es
// obligatorio para que Expo lo incluya en el bundle del cliente).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export type Team = { id: string; name: string; country: string };

export type MatchEvent = {
  id: string;
  competitionId: string;
  homeTeam: Team;
  awayTeam: Team;
  kickoff: string;
  status: "scheduled" | "live" | "finished";
  minute: number | null;
  homeScore: number;
  awayScore: number;
};

export type MarketBlock = { label: string; data: Record<string, unknown> };
export type EventStats = { eventId: string; markets: Record<string, MarketBlock> };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export type TeamForm = {
  teamId: string;
  matchesConsidered: number;
  avgGoalsFor: number | null;
  avgGoalsAgainst: number | null;
  bttsRate: number | null;
  winRate: number | null;
  form: ("W" | "D" | "L")[];
};

export type HeadToHead = {
  matchesConsidered: number;
  teamWins: number;
  otherWins: number;
  draws: number;
};

export type SearchResult = {
  teams: { id: string; name: string; country: string; sport: string }[];
  competitions: { id: string; name: string; country: string; sport: string }[];
};

export const api = {
  competitions: () => get<{ id: string; name: string; country: string; sport: string }[]>("/v1/competitions"),
  eventsForCompetition: (competitionId: string, date?: string) =>
    get<MatchEvent[]>(
      `/v1/competitions/${competitionId}/events${date ? `?date=${date}` : ""}`,
    ),
  event: (eventId: string) => get<MatchEvent>(`/v1/events/${eventId}`),
  eventStats: (eventId: string) => get<EventStats>(`/v1/events/${eventId}/stats`),
  teamForm: (teamId: string) => get<TeamForm>(`/v1/teams/${teamId}/form`),
  headToHead: (teamId: string, otherId: string) =>
    get<HeadToHead>(`/v1/teams/${teamId}/vs/${otherId}`),
  search: (q: string) => get<SearchResult>(`/v1/search?q=${encodeURIComponent(q)}`),
  alerts: (eventId: string) =>
    get<{ id: string; market: string; message: string; createdAt: string }[]>(`/v1/events/${eventId}/alerts`),
};
