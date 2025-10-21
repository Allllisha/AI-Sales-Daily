# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY client/package*.json ./
RUN npm ci
COPY client/ .
# Remove local .env files to ensure production build uses only .env.production
RUN rm -f .env .env.local
RUN npm run build

# Build backend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ .

# Copy frontend build from previous stage
COPY --from=frontend-build /frontend/dist ./client/dist

# Expose port
EXPOSE 3001

# Health check for Azure Web App
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://127.0.0.1:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
