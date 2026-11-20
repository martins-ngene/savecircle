# SaveCircle MVP — Technical Validation & Verification Report

**Project Title**: SaveCircle MVP — Decentralized Group Savings, Contribution Scheduling & Rotating Payouts on Stellar  
**Network**: Stellar Testnet / Soroban  
**Report Date**: November 20, 2026  
**Status**: Verified & Passing All Criteria  

---

## 1. Executive Summary

SaveCircle is a decentralized group savings platform built on **Stellar Testnet** using **Soroban Smart Contracts**. The platform digitizes traditional group savings mechanisms (*Ajo*, *Esusu*, *Adashi*) by replacing informal and opaque arrangements with non-custodial, cryptographically enforced smart contracts.

The system combines:
1. **On-Chain Financial Core (Soroban)**: A multi-group registry smart contract written in Rust managing member onboarding, testnet USDC contributions, cycle pool funding, rotating payouts, multi-member withdrawal approvals, and exit refunds.
2. **Off-Chain Scheduling & Indexing Service (NestJS + Prisma)**: A backend platform providing cryptographic wallet challenge/verify authentication (SEP-0010 standard), contribution schedule generation, transparent member ledgers, in-app notifications, and a background Soroban RPC event listener.

The smart contract passes **100% of required automated tests** across all **18 PRD scenarios (18 of 18 tests passing)**, and has been compiled and deployed live on Stellar Testnet.

---

## 2. On-Chain Deployment Evidence (Stellar Testnet)

The Soroban smart contract (`group-savings`) was compiled to an optimized WebAssembly binary and deployed to Stellar Testnet:

| On-Chain Artifact | Value / Hash | Verification URL |
| :--- | :--- | :--- |
| **Contract ID** | `CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB` | [View in Stellar Lab](https://lab.stellar.org/r/testnet/contract/CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB) |
| **WASM Hash** | `8dd3e801c3c35b1ceaf62965764f045456cabe6334a6c8106ad75118e984af6f` | Target wasm32v1-none |
| **Admin Wallet** | `GCPZAXFI45FYYEG25SDJYI7EP7PR67EV2M24CGT6KJOHUBSEEYF5E36M` | Funded via Friendbot |
| **WASM Upload Tx** | `b0aad55980d98175d6b071caf599306107c6c1f7958439bbd8e67fa2aac5d0e7` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/b0aad55980d98175d6b071caf599306107c6c1f7958439bbd8e67fa2aac5d0e7) |
| **Contract Creation Tx** | `9be507afc5f7454ebb51f333462993876c1ba9908ec989ce72cf577a3f0f5564` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/9be507afc5f7454ebb51f333462993876c1ba9908ec989ce72cf577a3f0f5564) |
| **Contract Init Tx** | `5b9a126d724729e5da839b9f716bff4c4221387b8ffc2f32b3a2168fc7c68c67` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/5b9a126d724729e5da839b9f716bff4c4221387b8ffc2f32b3a2168fc7c68c67) |
| **Live Create Group Tx** | `333624b8c4daabc6b9c8010586248d995669d29c5ac710ff368db1f58c107b09` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/333624b8c4daabc6b9c8010586248d995669d29c5ac710ff368db1f58c107b09) |
| **Testnet USDC Token** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` | Official Stellar Testnet USDC SAC |

---

## 3. Smart Contract Verification: All 18 PRD Scenarios

The Rust Soroban smart contract was validated against all 18 mandatory PRD test scenarios in `contracts/group-savings/src/test.rs`:

```text
running 18 tests
test test::test_01_create_valid_savings_group ... ok
test test::test_02_register_authorized_members ... ok
test test::test_03_member_accepts_group_rules ... ok
test test::test_04_authorized_member_contributes ... ok
test test::test_05_unauthorized_wallet_contributes ... ok
test test::test_06_multiple_members_contribute ... ok
test test::test_07_contribution_assigned_to_correct_cycle ... ok
test test::test_08_attempt_payout_before_cycle_fully_funded ... ok
test test::test_09_fully_funded_rotating_payout ... ok
test test::test_10_duplicate_cycle_payout ... ok
test test::test_11_unauthorized_withdrawal ... ok
test test::test_12_withdrawal_without_approvals ... ok
test test::test_13_valid_approved_withdrawal ... ok
test test::test_14_withdrawal_exceeds_balance ... ok
test test::test_15_invalid_contribution_amount ... ok
test test::test_16_member_exit_and_eligible_refund ... ok
test test::test_17_failed_token_transfer ... ok
test test::test_18_dashboard_accounting_reconciliation ... ok

test result: ok. 18 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.96s
```

### Scenario Breakdown Matrix

| ID | Test Scenario | Expected Outcome | Actual Verification | Result |
| :--- | :--- | :--- | :--- | :--- |
| **TS-01** | Create valid savings group | Group created with configuration and cycle records | Group state initialized; 5 cycles pre-generated | **PASS** |
| **TS-02** | Register authorized members | Members recorded with rotation positions | Status `Invited`; cycle recipients mapped | **PASS** |
| **TS-03** | Member accepts group rules | Rules accepted; membership activated | Status transitions to `Active`; `rules_accepted = true` | **PASS** |
| **TS-04** | Authorized member contributes | USDC transferred to contract escrow | Member record and cycle collected amount updated | **PASS** |
| **TS-05** | Unauthorized wallet contributes | Contribution rejected | Reverts with `Error::MemberNotFound` | **PASS** |
| **TS-06** | Multiple members contribute | Aggregate pool balances updated | Cycle collected amount reaches 500; status `Funded` | **PASS** |
| **TS-07** | Contribution assigned to cycle | Explicit cycle accounting | Cycle 1 and Cycle 2 track distinct deposits | **PASS** |
| **TS-08** | Attempt payout before fully funded | Payout rejected for partial pool | Reverts with `Error::CycleNotFullyFunded` | **PASS** |
| **TS-09** | Fully funded rotating payout | Recipient paid 500 USDC pool | Recipient balance increased; cycle status `Paid` | **PASS** |
| **TS-10** | Duplicate cycle payout | Payout cannot be executed twice | Reverts with `Error::CycleAlreadyPaid` | **PASS** |
| **TS-11** | Unauthorized withdrawal | Non-member request rejected | Reverts with `Error::MemberNotFound` | **PASS** |
| **TS-12** | Withdrawal without approvals | Execution rejected without threshold approvals | Reverts with `Error::ThresholdNotMet` | **PASS** |
| **TS-13** | Valid approved withdrawal | Funds released once threshold reached | Status `Executed`; recipient receives tokens | **PASS** |
| **TS-14** | Withdrawal exceeds balance | Cannot withdraw more than available | Reverts with `Error::InsufficientBalance` | **PASS** |
| **TS-15** | Invalid contribution amount | Contribution not matching agreed amount | Reverts with `Error::InvalidContributionAmount` | **PASS** |
| **TS-16** | Member exit and refund | Exiting member refunded; past recipients blocked | Unallocated share refunded; debtors blocked | **PASS** |
| **TS-17** | Failed token transfer | State consistency on insufficient balance | Contract state unchanged; balances intact | **PASS** |
| **TS-18** | Dashboard accounting reconciliation | On-chain math invariant holds | `available_balance = received - paid - refunded` | **PASS** |

---

## 4. Architectural & Security Guarantees

1. **Reentrancy & Double-Payout Prevention**:
   - The contract transitions the cycle status to `Paid` and writes to storage *before* calling the external token transfer.
   - Any reentrant or concurrent call immediately encounters `CycleAlreadyPaid`.
2. **Cryptographic Authorization**:
   - Every state-altering call enforces `require_auth()` on the respective participant.
   - Organizers cannot access member funds or change payout recipients without member consent.
3. **No Private Key Custody**:
   - The backend service does not handle or store private keys.
   - All blockchain transactions are signed on the client via Stellar Wallets Kit.
4. **Resilient Dual-Layer State**:
   - Off-chain PostgreSQL records provide responsive queries and notification triggers.
   - The on-chain Soroban contract remains the immutable, single source of truth for all balances.
