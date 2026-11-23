# SaveCircle MVP — Containerized Local Development

This guide outlines how to build and run the SaveCircle Backend and PostgreSQL database using Docker.

---

## 1. Prerequisites
- Docker Engine & Docker Compose (v2.0+)
- Git

---

## 2. Quickstart with Docker Compose

Run the entire backend stack (NestJS API + Managed PostgreSQL 16) with one command from the project root:

```bash
docker compose --env-file /dev/null up --build
```

### What Happens:
1. Provisions a PostgreSQL 16 container with healthcheck (`savecircle-postgres`).
2. Builds the multi-stage Docker image for the NestJS backend (`savecircle-backend`), compiling `@savecircle/shared` and generating Prisma Client.
3. Automatically synchronizes Prisma tables in the `savecircle` PostgreSQL schema.
4. Starts the API on port `4000` with background Soroban RPC event indexing connected to Stellar Testnet.

---

## 3. Verifying the Containerized Services

Once running:
- **API Health / Config**: [http://localhost:4000/api/blockchain/config](http://localhost:4000/api/blockchain/config)
- **Interactive Swagger Documentation**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **PostgreSQL Database**: Accessible on host port `5433` (Username: `postgres`, Password: `postgres`, DB: `savecircle`). Set `SAVECIRCLE_POSTGRES_PORT` in your shell to use a different host port.

Run `npm run dev` from `savecircle-frontend` to start the frontend on port 3000.
Frontend API integrations use `apiBaseUrl` from `lib/api.ts`. It defaults to
`http://localhost:4000/api` in development and
`https://savecircle-backend.onrender.com/api` in production builds.
To test a production frontend build against Docker, run
`NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api npm run build`.

---

## 4. Useful Commands

```bash
# Run in background (detached mode)
docker compose --env-file /dev/null up -d

# View real-time application logs
docker compose --env-file /dev/null logs -f backend

# Stop all containers and network
docker compose --env-file /dev/null down

# Stop and wipe database volume
docker compose --env-file /dev/null down -v
```
