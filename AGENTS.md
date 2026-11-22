# Workspace Agent Guidelines — SaveCircle Backend & Smart Contracts

Welcome to the **SaveCircle** backend and smart contract workspace. This document establishes the operational directives, architectural standards, security rules, and development conventions for this project.

---

## 1. Git Version Control: User-Only Manual Add, Commit, and Push

- **NEVER run `git add`, `git commit`, `git push`, or any command that stages, commits, or pushes changes**.
- **The USER must always be the one to manually add, commit, and push changes** so that they review all work before it is committed or published.
- Agents may run read-only git inspection commands (`git status`, `git diff`, `git log`) to verify working tree status, but **MUST NEVER** stage, commit, or push under any circumstances.

---

## 2. Zero-Tolerance Rule: Do NOT Touch or Access `.env` Files

- **Never touch, open, read, inspect, display, edit, or modify any `.env` file** (`.env`, `.env.local`, `.env.production`, etc.).
- Never log, print, output, or echo environment file contents.
- **Allowed Exception**: `.env.example` templates containing only dummy/placeholder values.

---

## 3. Scope & Team Responsibilities

- **Backend & Smart Contracts Scope (Our Scope)**:
  - **Soroban Smart Contract (`contracts/group-savings`)**: Multi-group savings registry, contribution cycle accounting, USDC token transfers, rotating payouts, withdrawal requests/approvals, member exit/refunds, duplicate payout prevention, and contract events.
  - **Smart Contract Testing**: 100% coverage of all 18 PRD test scenarios (`contracts/group-savings/src/test.rs`).
  - **Stellar Testnet Deployment**: WASM compilation, contract deployment, initialization, and on-chain verification.
  - **NestJS Backend API (`apps/backend`)**: SEP-0010 cryptographic wallet challenge/verify authentication, group metadata, contribution schedule generator, member financial ledger, and background Soroban RPC event indexer.
  - **PostgreSQL & Prisma ORM**: Off-chain metadata, user profiles, invitation tokens, cached ledger states, and notifications.
  - **Infrastructure**: Render deployment Blueprint (`render.yaml`).
- **Frontend Scope (External / Handed Off to Frontend Team)**:
  - Maintained by the Frontend Engineer and UI/UX Designer.
  - We maintain [HANDSHAKE.md](file:///Users/martinium-dev/projects/buildershq-projects/savecircle/HANDSHAKE.md) and interactive Swagger OpenAPI documentation at `/docs` as the authoritative integration contract for the frontend team.

---

## 4. Architectural & Security Mandates

- **Smart Contracts (Soroban SDK)**:
  - Always enforce `require_auth()` on transaction callers.
  - **Reentrancy & Double-Payout Guard**: Transition cycle status to `Paid` and commit state changes to storage *before* calling external token transfers.
  - **Role & Threshold Verification**: Only active members can contribute; rotating payouts can only release once cycle pool is 100% funded; withdrawal requests must satisfy group approval thresholds.
  - **Exit & Refund Constraints**: Exiting members who have already received a payout cannot exit leaving outstanding obligations.
  - Target Network: **Stellar Testnet**.
- **Backend & Data Privacy**:
  - **Zero Private Key Custody**: The backend never accepts, generates, or stores user or organizer private keys. All transaction signing occurs client-side via Stellar Wallets Kit.
  - **Dual-State Reconciliation**: Off-chain ledger queries are fast and cached in PostgreSQL, but continuously reconciled against confirmed on-chain event streams via the background Soroban RPC indexer.
  - **Database Migration Guard**: Any unattended `prisma db push` command must include `--accept-data-loss` in `render.yaml` to prevent non-interactive deployment aborts.
- **Render Cloud Deployment & PostgreSQL Schema Isolation Rule**:
  - **Single Free Database Limit**: Render strictly limits accounts to at most one active free-tier PostgreSQL database. Never define a new `databases:` block with `plan: free` in `render.yaml` when an active database already exists on the account; doing so immediately aborts Blueprint sync with `(cannot have more than one active free tier database)`.
  - **Shared Instance via Schema Multi-Tenancy**: Multiple projects must share a single PostgreSQL instance by partitioning data into isolated schemas (`?schema=<project_name>`, e.g. `?schema=savecircle`).
  - **Blueprint Configuration**: In `render.yaml`, omit the `databases:` section and reference the existing database instance under `envVars:` using `fromDatabase` (e.g., `name: ticketchain-db, property: connectionString`) or set `DATABASE_URL` with `sync: false`.
  - **Application-Level Schema Isolation**:
    - The application startup runner (`scripts/start-production.js`) and database client (`PrismaService`) must verify and append/set `schema=<project_name>` on `DATABASE_URL` prior to running `prisma db push --accept-data-loss` or establishing pool connections.
    - This guarantees that tables are created strictly in the project's dedicated schema without table collisions or cross-project interference.
- **API Documentation**:
  - Maintain interactive Swagger / OpenAPI 3.0 documentation at `/docs`.

---

## 5. Continuity & Checkpoints

- Maintain [todo.md](file:///Users/martinium-dev/projects/buildershq-projects/savecircle/todo.md) to track sprint progress and deliverables.
- Maintain [TECHNICAL_REPORT.md](file:///Users/martinium-dev/projects/buildershq-projects/savecircle/TECHNICAL_REPORT.md) as the verified technical report with testnet transaction hashes and explorer links.
