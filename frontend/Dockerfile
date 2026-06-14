FROM node:20-alpine

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=8192

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY types ./types
COPY next.config.ts ./
COPY next-env.d.ts ./
COPY tsconfig.json ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY components.json ./

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
