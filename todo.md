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

## Phase 5: Technical Report, CI/CD Pipeline & Deployment
- [x] Configure `render.yaml` Blueprint for backend and PostgreSQL hosting on Render
- [x] Provision dedicated persistent PostgreSQL database (`savecircle-db`) on `0.5c-1g` tier
- [x] Create GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`) for pre-flight testing and container verification
- [x] Generate `TECHNICAL_REPORT.md` with testnet transaction hashes, explorer links, and test matrix
- [x] Document local containerization in `LOCAL_DOCKER.md`
- [x] Finalize `README.md` with developer setup and architecture documentation
- [ ] Re-verify end-to-end PRD coverage after the funded Testnet run and resolve or explicitly defer the open items below.

## Backend handoff for circle creation and invitations

- [x] Link API circles through organizer-authorized `POST /api/groups/:id/link-on-chain`. The API verifies the confirmed creation transaction and the frontend guides organizer registration and member acceptance.
- [ ] Define and persist custom first contribution dates, grace periods, fixed payout amounts and recipients, and custom rotation order if these options are planned. The current API generates cycles relative to creation, assigns the organizer to position 1, and supports the rotating workflow used by the frontend.
- [ ] Make circle creation retry-safe. Document an idempotency key for `POST /api/groups` and create the circle, organizer membership, and cycles atomically so a timeout or partial failure cannot create duplicate or incomplete circles.
- [x] Reserve membership and the cycle recipient in one transaction. A concurrent claim returns HTTP 409 so the frontend can reload available positions.
- [ ] Add persistent rule and schedule amendments. The current API and contract expose no proposal or execution workflow for these changes.
- [ ] Add one-time exit/refund protection to the contract, deploy the corrected contract, and reconcile exit/refund events before exposing this action in Group Management.
- [ ] Backfill events when a saved cursor falls outside RPC retention and reconcile any existing cached totals before a wider rollout.

## Testnet verification and rollout

- [ ] Complete a funded Freighter browser run with separate organizer and member wallets. Register and link a circle, register both members and accept the rules, fully fund a cycle, release its payout, and request, approve, and execute a withdrawal against available funds. Check that Schedule, My Ledger, and Group Management show the expected records after confirmation and refresh.
- [ ] Recover stalled transaction attempts when RPC keeps returning `NOT_FOUND`. Persist the transaction validity window with its hash and allow a fresh signature only after checking that the previous transaction expired without landing.
- [ ] Deploy the updated backend and frontend together, then repeat the sign-in, invitation, and read-only checks against the hosted API. The new frontend uses the verified circle-linking route and expects the backend to index the resulting transactions.
- [ ] Document organizer-only `POST /api/groups/:id/members` in the handshake, including the reservation payload and how it relates to the organizer’s on-chain registration.
