# Stage 1: Base image
FROM node:20-alpine AS base

WORKDIR /app

# Install build dependencies for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY frontend/ ./frontend/
COPY backend/ ./backend/
COPY .env ./

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Seed database and start server
CMD ["sh", "-c", "node backend/database/seed.js && node backend/server.js"]
