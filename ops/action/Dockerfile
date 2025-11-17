FROM node:24-alpine AS base
WORKDIR /workspace
COPY package*.json ./
RUN npm install --include=dev
COPY . .

FROM base AS build
RUN npm run build

FROM base AS test
ENV NODE_ENV=test
CMD ["npm", "test"]

FROM base AS lint
ENV NODE_ENV=lint
CMD ["npm", "run", "lint"]

FROM node:24-alpine AS runtime
WORKDIR /workspace
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /workspace/dist ./dist
ENV NODE_ENV=production

USER node
CMD ["node", "dist/index.js"]
