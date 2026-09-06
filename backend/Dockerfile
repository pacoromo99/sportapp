FROM node:22-slim AS build
WORKDIR /app
# Prisma necesita OpenSSL para el motor de esquema/consultas — node:22-slim
# no lo trae por defecto (sin esto, `prisma generate`/`db push` fallan en
# runtime con "Schema engine error" sin más detalle).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install
COPY . .
# El schema versionado usa SQLite para desarrollo local sin infraestructura.
# En producción cambiamos el provider a Postgres antes de generar el cliente
# (DATABASE_URL en este entorno debe apuntar a tu Postgres gestionado).
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN npx prisma generate
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
# db push antes de arrancar: crea/actualiza el esquema en el Postgres del
# entorno (ver DATABASE_URL). En un pipeline con varias réplicas, mover esto
# a un paso de release aparte para no correrlo en cada instancia.
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
