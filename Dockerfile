# ==============================
# Base
# ==============================
FROM node:22-bookworm-slim AS base
WORKDIR /app
# O Prisma (schema engine) precisa do OpenSSL
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ==============================
# Dependências (inclui devDependencies para o build)
# ==============================
FROM base AS deps
# O package-lock.json foi gerado com npm 11 (o node:22 traz npm 10)
RUN npm install -g npm@11
COPY package.json package-lock.json ./
RUN npm ci

# ==============================
# Build (também usado pelo serviço de migrações)
# ==============================
FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

# ==============================
# Apenas dependências de produção (mantém o client Prisma gerado)
# ==============================
FROM build AS prod-deps
RUN npm prune --omit=dev

# ==============================
# Runtime
# ==============================
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# Dados de idioma do Tesseract (OCR) — evita o download em runtime
COPY --chown=node:node por.traineddata ./

RUN chown node:node /app
USER node

EXPOSE 3001
CMD ["node", "dist/main.js"]
