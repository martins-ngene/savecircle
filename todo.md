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
- [x] Connect Freighter sign-in and invitation acceptance to the local API
- [x] Show the signed-in member’s circles, payout spots, and contribution obligations on the dashboard overview
- [x] Create rotating circles through the API, share server-generated invitations, and show API-backed circle details
- [x] Complete Handshake §3.2 in My Circles with the group detail endpoint and rule acceptance for invited members
- [x] Replace Schedule and My Ledger previews with authenticated circle selection and the read endpoints in Handshake §§3.3–3.4
- [x] Connect Stellar configuration and transaction status, verified circle linking, and wallet-signed contribution, payout, withdrawal, and membership actions
- [x] Add the public `/proof` hub with recorded screen evidence, a chaptered walkthrough, and Testnet verification links

## Phase 5: Technical Report, CI/CD Pipeline & Deployment
- [x] Configure `render.yaml` Blueprint for backend and PostgreSQL hosting on Render
- [x] Provision dedicated persistent PostgreSQL database (`savecircle-db`) on `0.1c-256mb` (0.1 CPU, 15 GB SSD) tier
- [x] Create GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`) for pre-flight testing and container verification
- [x] Generate `TECHNICAL_REPORT.md` with testnet transaction hashes, explorer links, and test matrix
- [x] Document local containerization in `LOCAL_DOCKER.md`
- [x] Finalize `README.md` with developer setup and architecture documentation
- [x] Re-verify end-to-end PRD coverage after the funded Testnet run and resolve or explicitly defer the open items below.

## Backend handoff for circle creation and invitations

- [x] Link API circles through organizer-authorized `POST /api/groups/:id/link-on-chain`. The API verifies the confirmed creation transaction and the frontend guides organizer registration and member acceptance.
- [x] Make circle creation retry-safe. Added `Idempotency-Key` header and payload support to `POST /api/groups` and wrapped circle creation, organizer membership, and cycle generation atomically inside Prisma `$transaction`.
- [x] Reserve membership and the cycle recipient in one transaction. A concurrent claim returns HTTP 409 so the frontend can reload available positions.
- [x] Self-healing RPC event indexer: auto-recovers when a saved cursor falls outside Soroban RPC retention by discovering latest ledger and resetting cursor.
- [ ] *(Deferred to v2)*: Define and persist custom first contribution dates, grace periods, fixed payout amounts and recipients, and custom rotation order. Current architecture enforces strictly rotating cycles relative to circle creation.
- [ ] *(Deferred to v2)*: Add persistent rule and schedule amendments. Current contract and API maintain strict immutability of cycle durations and contribution targets for trust.
- [ ] *(Deferred to v2)*: Contract-level one-time exit/refund state protection on smart contract upgrade.

## Testnet verification and rollout

- [x] Complete live two-wallet funded Testnet run between separate organizer (`savecircle-admin`: `GCPZAXFI...`) and member (`savecircle-member`: `GCT3IFSI...`) wallets on contract `CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB`:
  - Group 2 creation: Tx `a37a41182bdf457effca7398d6a5d13a0119ae79c0c04f2a1895b294468fef56`
  - Member registration: Tx `1fd2dd9f40b2135ba56b500089591b1052b9a4f628f98e229c84d4bafe2a4701`
  - Rules acceptance: Tx `c47c982e18f8af514bcf8606c758b7a743a9ee2fa3db4ef3ff928a27d82ef4d3`
- [ ] Recover stalled transaction attempts when RPC keeps returning `NOT_FOUND`. Persist the transaction validity window with its hash and allow a fresh signature only after checking that the previous transaction expired without landing.
- [ ] Deploy the updated backend and frontend together, then repeat the sign-in, invitation, and read-only checks against the hosted API. The new frontend uses the verified circle-linking route and expects the backend to index the resulting transactions.
- [x] Document organizer-only `POST /api/groups/:id/members` in the handshake, including the reservation payload and how it relates to the organizer’s on-chain registration.
