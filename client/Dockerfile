# Node 20 is EOL and will never receive a fix for CVE-2026-111497 (Brotli RCE).
# 24.22.1 is the first patched 24.x release; keep this in step with the droplet.
FROM node:24.22.1-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
