# Base Image
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies for all workspaces
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY shared/packet/package.json shared/packet/
COPY shared/mesh/package.json shared/mesh/
RUN npm ci

# Copy source code
COPY . .

# Build the shared packages
RUN npm run build -w @location-emitter/packet
RUN npm run build -w @location-emitter/mesh

# Production Image
FROM node:22-alpine AS production
WORKDIR /app

# Copy built assets and dependencies from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/backend ./backend
COPY --from=base /app/shared ./shared

# Expose backend port
EXPOSE 3000

# Start backend server using tsx
CMD ["npm", "run", "dev", "-w", "@location-emitter/backend"]
