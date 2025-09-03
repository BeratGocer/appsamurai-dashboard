FROM node:18-bullseye-slim

WORKDIR /app

# System deps for Prisma (openssl)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies with npm
RUN npm install --production=false

# Copy source code
COPY . .

# Generate Prisma client inside the container (ensures linux-glibc engine)
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 8787

# Start the application
CMD ["npm", "start"]
