FROM node:22.23.2-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS build

RUN npm install --global pnpm@12.4.1

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY services/control-plane/package.json services/control-plane/package.json
RUN pnpm install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY packages/observability packages/observability
COPY services/control-plane services/control-plane
RUN pnpm --filter @automation-control-plane/contracts build \
    && pnpm --filter @automation-control-plane/observability build \
    && pnpm --filter @automation-control-plane/control-plane build \
    && pnpm --filter @automation-control-plane/control-plane deploy --prod /out

FROM node:22.23.2-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/corepack /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=build --chown=node:node /out ./
COPY --chown=node:node automations ./automations
COPY --chown=node:node docs/runbooks ./docs/runbooks

USER node
EXPOSE 4000

CMD ["node", "dist/api.js"]
