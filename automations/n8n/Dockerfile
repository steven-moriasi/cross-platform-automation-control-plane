FROM node:22.23.2-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS node-build

RUN npm install --global pnpm@12.4.1

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY automations/n8n/nodes/n8n-nodes-control-plane-telemetry/package.json automations/n8n/nodes/n8n-nodes-control-plane-telemetry/package.json

RUN pnpm install --frozen-lockfile

COPY automations/n8n/nodes/n8n-nodes-control-plane-telemetry automations/n8n/nodes/n8n-nodes-control-plane-telemetry

RUN pnpm --filter n8n-nodes-control-plane-telemetry build

FROM n8nio/n8n:2.40.6

USER root

RUN mkdir -p /home/node/.n8n/custom/node_modules/n8n-nodes-control-plane-telemetry

COPY --from=node-build --chown=node:node /workspace/automations/n8n/nodes/n8n-nodes-control-plane-telemetry/package.json /home/node/.n8n/custom/node_modules/n8n-nodes-control-plane-telemetry/package.json
COPY --from=node-build --chown=node:node /workspace/automations/n8n/nodes/n8n-nodes-control-plane-telemetry/dist /home/node/.n8n/custom/node_modules/n8n-nodes-control-plane-telemetry/dist

USER node
