# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

# Create non-root user (node group and user already exist with uid/gid 1000)
RUN mkdir -p /home/node/.npm /app && \
    chown -R node:node /home/node /app

WORKDIR /app

# Copy package files
COPY --chown=node:node package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    chown -R node:node /app/node_modules

# Copy built application from builder
COPY --from=builder --chown=node:node /app/dist ./dist

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Run the application
CMD ["node", "dist/main"]
