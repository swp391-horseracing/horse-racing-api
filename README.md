# Horse Racing API

## Requirements

- [**Nodejs**](https://nodejs.org/en) v25+
- [**Docker**](https://www.docker.com/)

## Getting Started

### Clone the repository

```bash
git clone https://github.com/swp391-horseracing/horse-racing-api
cd horse-racing-api
```

### Setup Environment Variables

```
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
DB_HOST=
DB_PORT=

JWT_SECRET=
JWT_EXPIRES_IN=

PORT=
DATABASE_URL=
```

### Setup Database

```bash
npx drizzle-kit migrate
```

### Run The Applications

```bash
npm run dev
```
