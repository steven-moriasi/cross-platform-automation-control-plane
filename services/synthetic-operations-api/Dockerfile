FROM node:22.20.0-alpine AS build

RUN npm install --global pnpm@12.4.1

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/synthetic-operations-api/package.json services/synthetic-operations-api/package.json
RUN pnpm install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY services/synthetic-operations-api services/synthetic-operations-api
RUN pnpm --filter @automation-control-plane/contracts build \
    && pnpm --filter @automation-control-plane/synthetic-operations-api build \
    && pnpm --filter @automation-control-plane/synthetic-operations-api deploy --prod /out

FROM node:22.20.0-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /out ./

USER node
EXPOSE 4100

CMD ["node", "dist/api.js"]
