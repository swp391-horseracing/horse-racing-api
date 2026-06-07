FROM node:26-alpine3.22 AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm run db:generate

RUN npm prune --production

FROM node:26-alpine3.22

WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/dist /app/dist
COPY --from=build --chown=node:node /app/drizzle /app/drizzle
COPY --from=build --chown=node:node /app/openapi.yaml /app/openapi.yaml

EXPOSE ${PORT}

CMD ["node", "dist/app.js"]
