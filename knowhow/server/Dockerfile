# Development stage
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Production stage - builds frontend + backend into a single image
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN rm -f .env .env.local
RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
RUN rm -f .env .env.local .env.development
COPY --from=frontend-build /frontend/dist ./client/dist
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://127.0.0.1:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"
CMD ["sh", "-c", "npm run db:migrate && npm start"]
