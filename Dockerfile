# ---- Build Stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# Increase memory limit
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install dependencies and build
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Run Stage ----
FROM node:18-alpine
WORKDIR /app

# Install serve to serve the app
RUN npm install -g serve

# Copy built files from the previous stage
COPY --from=builder /app/build ./build

# Expose port for Cloud Run
EXPOSE 3000

# Start the app
CMD ["serve", "-s", "build", "-l", "3000"]
