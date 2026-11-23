# SaveCircle MVP — Backend & Smart Contract Task Checklist

**Ownership Scope**: Soroban Smart Contract, Backend API & Event Indexer, Stellar Testnet & Render Cloud Deployment, Frontend Integration Handshake.

---

## Phase 0: Workspace & Scaffolding
- [x] Initialize monorepo structure (`contracts/`, `apps/backend/`, `packages/shared/`)
- [x] Configure root `package.json`, TypeScript configs, `.gitignore`, and `.env.example`
- [x] Setup `packages/shared` with shared types, status enums, and DTO schemas

## Phase 1: Soroban Smart Contract (`contracts/group-savings`)
- [x] Initialize Soroban Rust crate with `soroban-sdk` v28
- [x] Implement storage layout (`GroupConfig`, `MemberRecord`, `CycleRecord`, `WithdrawalRequest`, `GroupAccounting`)
- [x] Implement group registration and member onboarding logic (`register_member`, `accept_rules`)
- [x] Implement USDC token transfer integration and contribution accounting
- [x] Implement rotating cycle payout engine with completeness and duplicate execution guards
- [x] Implement multi-member withdrawal request, approval, and execution system
- [x] Implement member exit and refund calculation logic
- [x] Emit structured contract events for all financial operations
- [x] Implement comprehensive automated unit tests covering all 18 PRD scenarios (TS-01 to TS-18: 18/18 passing)

## Phase 2: Stellar Testnet Deployment & Verification
- [x] Compile optimized WASM (`stellar contract build` -> `group_savings.wasm`, 20,507 bytes)
- [x] Generate and fund testnet deployer keypair (`savecircle-admin`: `GCPZAXFI...`)
- [x] Upload WASM and deploy contract instance to Stellar Testnet (`CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB`)
- [x] Initialize contract with admin wallet
- [x] Execute live testnet group creation invocation (`Genesis Circle`, Tx `333624b8...`)
- [x] Record deployment hashes, contract ID, and testnet explorer links

## Phase 3: Backend API, Database & Event Indexer (`apps/backend`)
- [x] Scaffold NestJS / TypeScript backend
- [x] Configure PostgreSQL database schema via Prisma ORM
- [x] Implement SEP-0010 wallet challenge/verify authentication and JWT session
- [x] Implement Group metadata, member profile, and invitation link endpoints
- [x] Implement contribution schedule generator (weekly, biweekly, monthly) and reminder calculations
- [x] Implement Member Ledger query endpoint with expected vs paid reconciliation
- [x] Build Soroban RPC event listener service to continuously index contract transactions
- [x] Setup Swagger/OpenAPI interactive documentation at `/docs`
- [x] Implement in-memory mock store and 23 automated system & regression tests (`npm test`)
- [x] Add production entrypoint smoke test (`scripts/smoke-test.js`)
- [x] Containerize backend with multi-stage Dockerfile and `docker-compose.yml`

## Phase 4: Frontend Handshake & Integration Assets
- [x] Export TypeScript shared types and DTOs (`packages/shared`)
- [x] Author `HANDSHAKE.md` detailing API endpoints, payloads, and contract invocation flows
- [x] Document client-side transaction signing workflows for the Frontend team

## Phase 5: Technical Report, CI/CD Pipeline & Deployment
- [x] Configure `render.yaml` Blueprint for backend and PostgreSQL hosting on Render
- [x] Provision dedicated persistent PostgreSQL database (`savecircle-db`) on `basic-256mb` (0.1 CPU, 1 GB disk) tier
- [x] Create GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`) for pre-flight testing and container verification
- [x] Generate `TECHNICAL_REPORT.md` with testnet transaction hashes, explorer links, and test matrix
- [x] Document local containerization in `LOCAL_DOCKER.md`
- [x] Finalize `README.md` with developer setup and architecture documentation
- [x] Verify 100% completion against the PRD requirements
