FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV SHERLOCK_BIN=/opt/sherlock/bin/sherlock
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/sherlock \
    && /opt/sherlock/bin/pip install --no-cache-dir sherlock-project

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

COPY . .

EXPOSE 8797
CMD ["npm", "start"]
