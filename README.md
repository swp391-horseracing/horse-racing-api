# Horse Racing API

A REST API built with **Express**, **Drizzle ORM**, **PostgreSQL**, and **JWT authentication**, written in TypeScript.

---

## Prerequisites

- [**Nodejs**](https://nodejs.org/en) v25+
- [**Docker**](https://www.docker.com/)

## Getting Started

### Clone the repository

```bash
git clone https://github.com/swp391-horseracing/horse-racing-api
cd horse-racing-api
```

### Install Dependencies

```bash
npm install
```

### Setup Environment Variables

```bash
cp .env.example .env
```

```
# Database Env
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
DB_HOST=
DB_PORT=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=

# App
PORT=
DATABASE_URL=
```

### Start Services

```bash
docker compose --env-file=.env  -f .docker/compose.local.yaml up -d
```

### Migrate Database

```bash
npx drizzle-kit migrate
```

### Run The Applications

```bash
npm run dev
```

---

## Available Scripts

| Script                 | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Start the server in development mode with hot reload (nodemon) |
| `npm run build`        | Compile TypeScript to JavaScript                               |
| `npm run start`        | Run the compiled production build                              |
| `npm run db:push`      | Push schema changes directly to the database                   |
| `npm run db:studio`    | Open Drizzle Studio (visual DB browser)                        |
| `npm run lint`         | Run ESLint                                                     |
| `npm run format:write` | Format code with Prettier                                      |
