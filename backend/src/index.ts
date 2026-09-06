import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { competitionRoutes } from "./routes/competitions.js";
import { eventRoutes } from "./routes/events.js";
import { teamRoutes } from "./routes/teams.js";
import { searchRoutes } from "./routes/search.js";
import { realtimeRoutes } from "./realtime.js";
import { startIngestion } from "./ingestion/scheduler.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

app.get("/health", async () => ({ status: "ok" }));

await app.register(competitionRoutes);
await app.register(eventRoutes);
await app.register(teamRoutes);
await app.register(searchRoutes);
await app.register(realtimeRoutes);

const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

startIngestion();
