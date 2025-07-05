# syntax=docker/dockerfile:1
# --- Build stage -----------------------------------------------------------
FROM node:20-alpine AS deps

# Install pnpm globally
RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate

WORKDIR /app

# Copy lockfiles first for better cache utilisation
COPY pnpm-lock.yaml package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage for TypeScript compilation
FROM deps AS builder
COPY . .
RUN pnpm build

# --- Runtime stage ---------------------------------------------------------
FROM node:20-alpine AS runner

# Re-enable pnpm in the runtime image
RUN corepack enable \
    && corepack prepare pnpm@10.12.4 --activate

WORKDIR /app

# Copy only production dependencies
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port your app listens on
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"] 