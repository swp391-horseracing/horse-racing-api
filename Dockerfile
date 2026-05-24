FROM node:26-alpine3.22 AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci
RUN npm prune --production

FROM node:26-alpine3.22

WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --chown=node:node . /app/

EXPOSE ${PORT}

CMD ["node", "app.js"]
