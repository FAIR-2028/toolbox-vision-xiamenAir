FROM node:22-bookworm-slim AS node-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=optional

FROM node:22-bookworm-slim AS node-builder
WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS python-runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /app/.venv-yolo
COPY requirements-onnx.txt ./
RUN /app/.venv-yolo/bin/pip install -r requirements-onnx.txt

FROM python-runtime AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 \
    ANALYSIS_MODE=yolo YOLO_BACKEND=cpu YOLO_PYTHON=/app/.venv-yolo/bin/python \
    YOLO_PROJECT_ROOT=/app YOLO_MODEL_PATH=/app/models/empty-slot-yolo11n.onnx
COPY --from=node-builder --chown=node:node /app/.next/standalone ./
COPY --from=node-builder --chown=node:node /app/.next/static ./.next/static
COPY --from=node-builder --chown=node:node /app/public ./public
COPY --from=node-builder --chown=node:node /app/scripts ./scripts
COPY --from=node-builder --chown=node:node /app/models/empty-slot-yolo11n.onnx ./models/empty-slot-yolo11n.onnx
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
