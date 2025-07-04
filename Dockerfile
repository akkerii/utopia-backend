# syntax=docker/dockerfile:1
# --- Build stage -----------------------------------------------------------
FROM node:20-alpine AS deps

# Install pnpm globally
RUN corepack enable \
    && corepack prepare pnpm@10.12.1 --activate

WORKDIR /app

# Copy lockfiles first for better cache utilisation
COPY pnpm-lock.yaml package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# --- Build stage -----------------------------------------------------------
FROM deps AS builder

# Copy source files
COPY . .

# Build the application
RUN pnpm build

# --- Runtime stage ---------------------------------------------------------
FROM node:20-alpine AS runner

# Re-enable pnpm in the runtime image
RUN corepack enable \
    && corepack prepare pnpm@10.12.1 --activate

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy only the necessary files from previous stages
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --chown=nextjs:nodejs package.json ./

# Switch to non-root user
USER nextjs

# Expose the port your app listens on
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["pnpm", "start"] 