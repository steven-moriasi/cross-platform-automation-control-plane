FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build

RUN npm install --global pnpm@12.4.1

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY services/synthetic-operations-api/package.json services/synthetic-operations-api/package.json
RUN pnpm install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY packages/observability packages/observability
COPY services/synthetic-operations-api services/synthetic-operations-api
RUN pnpm --filter @automation-control-plane/contracts build \
    && pnpm --filter @automation-control-plane/observability build \
    && pnpm --filter @automation-control-plane/synthetic-operations-api build \
    && pnpm --filter @automation-control-plane/synthetic-operations-api deploy --prod /out

FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/corepack /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=build --chown=node:node /out ./

USER node
EXPOSE 4100

CMD ["node", "dist/api.js"]
