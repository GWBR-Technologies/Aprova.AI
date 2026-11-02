# Sem etapa de build: o Node 24 executa o TypeScript diretamente e contracts/ só tem tipos,
# então a imagem leva apenas src, migrations e as dependências de produção.
# Contexto de build: backend/ (os arquivos abaixo nascem nos marcos B0 e B1 do guia do Back-End).
FROM node:24.22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# As dependências são JavaScript puro; scripts de instalação ficam desligados para reduzir a superfície de ataque.
RUN npm ci --omit=dev --ignore-scripts

FROM node:24.22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY migrations ./migrations
# SHA do commit, exposto no corpo do /readyz (campo version); o fluxo de promoção compara com o SHA promovido.
ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA
USER node
CMD ["node", "src/bootstrap/api.ts"]
