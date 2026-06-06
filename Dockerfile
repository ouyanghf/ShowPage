FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY src/ ./src/
COPY tsconfig.server.json vite.config.ts ./
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/storage

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/storage/showpage.db

EXPOSE 8080
CMD ["node", "dist/index.js"]
