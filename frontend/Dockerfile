FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy application code
COPY . .

# Build Next.js app
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
