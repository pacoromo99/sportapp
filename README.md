# SportApp — fútbol + tenis (v1)

Sigue la arquitectura del documento "Arquitectura Técnica — App
Multideporte" y el objetivo de producto "Datos que impulsan la apuesta":
cada pantalla de partido se organiza por mercado de apuestas (1X2,
over/under, córners, tarjetas, HT-FT, goleador...), no por una pestaña
"Estadísticas" genérica, con alertas contextuales para el momento exacto en
que algo relevante cambia (gol, roja, alineación confirmada). El detalle de
qué dato alimenta cada mercado está en
[`docs/market-mapping.md`](./docs/market-mapping.md).

Cubre **dos deportes desde el mismo núcleo canónico**: fútbol y tenis.
`Team` representa tanto un equipo como un jugador de tenis;
`Event.homeScore/awayScore` son goles en fútbol y sets ganados en tenis; el
cálculo de forma reciente y H2H es el mismo código para ambos. En tenis se
añadió el módulo `TennisSet`/`TennisEventStats` con sus propios mercados
(ganador de partido, hándicap de juegos, total de juegos con tasa de
tie-breaks, ganador de set, props de saque).

## Estado — verificado de punta a punta

Este código se instaló, compiló y arrancó de verdad (no es un scaffold sin
probar): `npm install` real en `backend/` y `mobile/`, los 12 tests
unitarios del backend pasan, `tsc --noEmit` sin errores en ambos paquetes, y
el backend se arrancó con SQLite, se sembró con datos de ejemplo y se
probaron con `curl` los endpoints reales de fútbol y tenis (incluido el
WebSocket de partido en vivo). Los datos de **fútbol** pueden venir de
verdad de API-Football (ver más abajo); los de **tenis** son de ejemplo por
ahora — API-Football no cubre tenis, así que la ingesta en vivo de tenis
queda como siguiente paso (ver "Qué falta").

## Arrancarlo en tu ordenador

Necesitas dos terminales abiertas a la vez: una para el backend y otra para
la app.

### 1. Backend

```bash
cd backend
npm install
npm run db:generate
npm run db:push      # crea dev.db (SQLite) con el esquema
npm run db:seed       # LaLiga (fútbol) + ATP Barcelona (tenis), con partidos en vivo y alertas de ejemplo
npm run dev            # arranca en http://localhost:3000
```

Déjalo corriendo. Puedes comprobar que responde con
`curl http://localhost:3000/health`.

Para tests: `npm test` (12 tests unitarios: forma/H2H, parseo de
estadísticas del proveedor, mercados de tenis).

Endpoints:

```
GET /v1/competitions
GET /v1/competitions/:id/events?date=2026-09-02
GET /v1/events/:id
GET /v1/events/:id/stats        # estadísticas agrupadas por mercado
GET /v1/events/:id/alerts        # historial de alertas contextuales
GET /v1/teams/:id/form            # forma reciente — mercado 1X2/over-under/BTTS
GET /v1/teams/:id/vs/:otherId     # enfrentamientos directos — mercado 1X2
GET /v1/search?q=betis
WS  /v1/live/:eventId               # deltas de partido + alertas en vivo
```

### 2. Datos reales de fútbol (opcional)

Sin esto, el backend sirve igualmente los datos de ejemplo del seed. Para
activar partidos de fútbol reales:

1. Crea una cuenta gratuita en [api-football.com](https://www.api-football.com/) (dashboard.api-football.com) y copia tu API key.
2. En `backend/.env`, añade:
   ```
   API_FOOTBALL_KEY=tu_clave
   FOLLOWED_LEAGUE_IDS=140   # LaLiga; separa varias con comas si quieres más ligas
   ```
3. Reinicia `npm run dev`. Verás en el log
   `[ingestion] arrancando sondeo cada 25s para ligas 140`, y cada gol,
   tarjeta roja o alineación confirmada generará una alerta real, difundida
   por WebSocket, exactamente igual que con los datos de ejemplo. El plan
   gratuito de API-Football tiene cuota limitada de peticiones/día — de
   sobra para probar la app con una liga.

Esto corre en tu propio ordenador con tu conexión normal a internet, así
que no depende de ninguna allowlist ni configuración especial.

### 3. App móvil (Expo Go)

```bash
cd mobile
npm install
npx expo start
```

Se abre una pantalla con un código QR. Instala **Expo Go** en tu móvil
(App Store / Google Play) y escanea el QR — tu móvil y tu ordenador deben
estar en la **misma red WiFi**.

**Importante**: por defecto la app apunta a `http://localhost:3000`, que
en tu ordenador funciona, pero un móvil físico no puede resolver
"localhost" como tu ordenador — necesita la IP local de tu ordenador en la
red WiFi. Antes de `npx expo start`, exporta:

```bash
# Mac/Linux: averigua tu IP local con `ifconfig` o `ipconfig getifaddr en0`
export EXPO_PUBLIC_API_BASE_URL=http://TU_IP_LOCAL:3000
export EXPO_PUBLIC_WS_BASE_URL=ws://TU_IP_LOCAL:3000
npx expo start
```

(Si en vez de un móvil físico usas un emulador/simulador en el mismo
ordenador, `localhost` sí funciona y puedes saltarte este paso.)

Pantallas: `LiveMatches` (partidos en vivo agrupados por competición, con
icono ⚽/🎾 para distinguir el deporte de un vistazo), `MatchDetail`
(paneles por mercado + forma/H2H + feed de alertas en vivo), `Search`
(buscador de equipos/competiciones — tocar una competición te lleva a sus
partidos).

### Despliegue

`Dockerfile` + `render.yaml` listos para desplegar el backend en Render (u
otro PaaS compatible con Docker + Postgres gestionado), según la sección de
infraestructura del documento de arquitectura. `API_FOOTBALL_KEY` se
configura a mano en el dashboard del proveedor, nunca en el repo. `eas.json`
tiene los builds de la app (Expo EAS) listos para inyectar
`EXPO_PUBLIC_API_BASE_URL`/`EXPO_PUBLIC_WS_BASE_URL` apuntando al backend
ya desplegado, en vez de tu IP local.

## Qué falta para producción (siguiente paso)

- **Ingesta real de tenis**: API-Football no cubre tenis; hace falta un
  proveedor de datos de tenis (p. ej. Sportradar u otro) para que el tenis
  tenga partidos en vivo reales, igual que ya tiene el fútbol.
- Redis para el pub/sub del WebSocket en vez de EventEmitter en memoria
  (necesario en cuanto haya más de un proceso backend).
- Ingesta de calendario completo de fútbol (no solo partidos en vivo) para
  poblar próximos partidos, no solo los que ya están jugándose.
- Push notifications reales para las alertas (hoy solo viajan por WebSocket
  mientras la pantalla está abierta) — Expo Notifications + un token por
  dispositivo suscrito a los partidos que sigue el usuario.
- Autenticación y rate limiting antes de exponer el backend públicamente.
- Widgets/Live Activities nativos.
- Buscar equipo → ver sus próximos partidos (hoy el buscador solo navega
  desde competiciones; falta el endpoint de "partidos de este equipo").
