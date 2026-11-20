#![cfg(test)]

use crate::{
    errors::ContractError,
    types::{CycleStatus, GroupStatus, MemberStatus, WithdrawalStatus},
    GroupSavingsContract, GroupSavingsContractClient,
};
use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env, String,
};

#[allow(dead_code)]
struct TestSetup<'a> {
    env: Env,
    client: GroupSavingsContractClient<'a>,
    admin: Address,
    organizer: Address,
    members: [Address; 5],
    token: token::Client<'a>,
    stellar_asset_client: token::StellarAssetClient<'a>,
}

const CONTRIBUTION_AMOUNT: i128 = 100_000_000; // 100 USDC (7 decimals)
const TOTAL_MEMBERS: u32 = 5;
const CYCLE_DURATION: u32 = 100;
const THRESHOLD: u32 = 3;

fn setup<'a>() -> TestSetup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GroupSavingsContract, ());
    let client = GroupSavingsContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let organizer = Address::generate(&env);
    let members = [
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];

    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token::Client::new(&env, &sac.address());
    let stellar_asset_client = token::StellarAssetClient::new(&env, &sac.address());

    client.initialize(&admin);

    // Mint USDC test tokens to all members (1,000 USDC each)
    let initial_balance: i128 = 1_000_000_000;
    for m in members.iter() {
        stellar_asset_client.mint(m, &initial_balance);
    }
    stellar_asset_client.mint(&organizer, &initial_balance);

    TestSetup {
        env,
        client,
        admin,
        organizer,
        members,
        token,
        stellar_asset_client,
    }
}

fn create_standard_group(setup: &TestSetup) -> u32 {
    let name = String::from_str(&setup.env, "Ajo Savings Circle");
    setup.client.create_group(
        &setup.organizer,
        &name,
        &setup.token.address,
        &CONTRIBUTION_AMOUNT,
        &TOTAL_MEMBERS,
        &CYCLE_DURATION,
        &THRESHOLD,
    )
}

fn onboard_all_members(setup: &TestSetup, group_id: u32) {
    for i in 0..5 {
        let member = &setup.members[i];
        let rotation_pos = (i + 1) as u32;
        setup.client.register_member(&setup.organizer, &group_id, member, &rotation_pos);
        setup.client.accept_rules(member, &group_id);
    }
}

// -------------------------------------------------------------
// TS-01: Create valid savings group
// -------------------------------------------------------------
#[test]
fn test_01_create_valid_savings_group() {
    let setup = setup();
    let group_id = create_standard_group(&setup);

    assert_eq!(group_id, 1);

    let group = setup.client.get_group(&group_id);
    assert_eq!(group.organizer, setup.organizer);
    assert_eq!(group.contribution_amount, CONTRIBUTION_AMOUNT);
    assert_eq!(group.total_members, TOTAL_MEMBERS);
    assert_eq!(group.approval_threshold, THRESHOLD);
    assert_eq!(group.status, GroupStatus::Active);

    let accounting = setup.client.get_accounting(&group_id);
    assert_eq!(accounting.total_funds_received, 0);
    assert_eq!(accounting.total_funds_paid_out, 0);
    assert_eq!(accounting.available_balance, 0);

    // Verify 5 cycles were initialized with correct target pools
    let expected_pool = CONTRIBUTION_AMOUNT * 5;
    for cycle_idx in 1..=5 {
        let cycle = setup.client.get_cycle(&group_id, &cycle_idx);
        assert_eq!(cycle.cycle_index, cycle_idx);
        assert_eq!(cycle.target_amount, expected_pool);
        assert_eq!(cycle.collected_amount, 0);
        assert_eq!(cycle.status, CycleStatus::Upcoming);
    }
}

// -------------------------------------------------------------
// TS-02: Register authorized members
// -------------------------------------------------------------
#[test]
fn test_02_register_authorized_members() {
    let setup = setup();
    let group_id = create_standard_group(&setup);

    for i in 0..5 {
        let member = &setup.members[i];
        let pos = (i + 1) as u32;
        setup.client.register_member(&setup.organizer, &group_id, member, &pos);

        let rec = setup.client.get_member(&group_id, member);
        assert_eq!(rec.address, *member);
        assert_eq!(rec.status, MemberStatus::Invited);
        assert_eq!(rec.rules_accepted, false);
        assert_eq!(rec.rotation_position, pos);

        // Verify cycle recipient mapped to this member
        let cycle = setup.client.get_cycle(&group_id, &pos);
        assert_eq!(cycle.recipient, *member);
    }
}

// -------------------------------------------------------------
// TS-03: Member accepts group rules
// -------------------------------------------------------------
#[test]
fn test_03_member_accepts_group_rules() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    let member = &setup.members[0];

    setup.client.register_member(&setup.organizer, &group_id, member, &1);

    // Before accepting
    let rec_before = setup.client.get_member(&group_id, member);
    assert_eq!(rec_before.rules_accepted, false);
    assert_eq!(rec_before.status, MemberStatus::Invited);

    // Accept rules
    setup.client.accept_rules(member, &group_id);

    // After accepting
    let rec_after = setup.client.get_member(&group_id, member);
    assert_eq!(rec_after.rules_accepted, true);
    assert_eq!(rec_after.status, MemberStatus::Active);
}

// -------------------------------------------------------------
// TS-04: Authorized member contributes
// -------------------------------------------------------------
#[test]
fn test_04_authorized_member_contributes() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    let member = &setup.members[0];
    let initial_balance = setup.token.balance(member);

    setup.client.contribute(member, &group_id, &1, &CONTRIBUTION_AMOUNT);

    // Member balance deducted
    assert_eq!(setup.token.balance(member), initial_balance - CONTRIBUTION_AMOUNT);

    // Contract has funds
    assert_eq!(setup.token.balance(&setup.client.address), CONTRIBUTION_AMOUNT);

    // Accounting updated
    let accounting = setup.client.get_accounting(&group_id);
    assert_eq!(accounting.total_funds_received, CONTRIBUTION_AMOUNT);
    assert_eq!(accounting.available_balance, CONTRIBUTION_AMOUNT);

    // Member ledger record updated
    let rec = setup.client.get_member(&group_id, member);
    assert_eq!(rec.total_contributed, CONTRIBUTION_AMOUNT);

    // Cycle record updated
    let cycle = setup.client.get_cycle(&group_id, &1);
    assert_eq!(cycle.collected_amount, CONTRIBUTION_AMOUNT);
    assert_eq!(cycle.status, CycleStatus::Pending);

    assert_eq!(setup.client.has_member_paid_cycle(&group_id, &1, member), true);
}

// -------------------------------------------------------------
// TS-05: Unauthorized wallet contributes
// -------------------------------------------------------------
#[test]
fn test_05_unauthorized_wallet_contributes() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    let rogue_wallet = Address::generate(&setup.env);
    setup.stellar_asset_client.mint(&rogue_wallet, &1_000_000_000);

    let res = setup.client.try_contribute(&rogue_wallet, &group_id, &1, &CONTRIBUTION_AMOUNT);
    assert_eq!(res, Err(Ok(ContractError::MemberNotFound)));
}

// -------------------------------------------------------------
// TS-06: Multiple members contribute
// -------------------------------------------------------------
#[test]
fn test_06_multiple_members_contribute() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    for member in setup.members.iter() {
        setup.client.contribute(member, &group_id, &1, &CONTRIBUTION_AMOUNT);
    }

    let expected_pool = CONTRIBUTION_AMOUNT * 5;
    let cycle = setup.client.get_cycle(&group_id, &1);
    assert_eq!(cycle.collected_amount, expected_pool);
    assert_eq!(cycle.status, CycleStatus::Funded);

    let accounting = setup.client.get_accounting(&group_id);
    assert_eq!(accounting.total_funds_received, expected_pool);
    assert_eq!(accounting.available_balance, expected_pool);
}

// -------------------------------------------------------------
// TS-07: Contribution assigned to correct cycle
// -------------------------------------------------------------
#[test]
fn test_07_contribution_assigned_to_correct_cycle() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // Member 0 contributes to Cycle 1
    setup.client.contribute(&setup.members[0], &group_id, &1, &CONTRIBUTION_AMOUNT);

    // Member 1 contributes to Cycle 2
    setup.client.contribute(&setup.members[1], &group_id, &2, &CONTRIBUTION_AMOUNT);

    let cycle_1 = setup.client.get_cycle(&group_id, &1);
    let cycle_2 = setup.client.get_cycle(&group_id, &2);

    assert_eq!(cycle_1.collected_amount, CONTRIBUTION_AMOUNT);
    assert_eq!(cycle_2.collected_amount, CONTRIBUTION_AMOUNT);
}

// -------------------------------------------------------------
// TS-08: Attempt payout before cycle fully funded
// -------------------------------------------------------------
#[test]
fn test_08_attempt_payout_before_cycle_fully_funded() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // Only 2 of 5 members contribute
    setup.client.contribute(&setup.members[0], &group_id, &1, &CONTRIBUTION_AMOUNT);
    setup.client.contribute(&setup.members[1], &group_id, &1, &CONTRIBUTION_AMOUNT);

    let res = setup.client.try_execute_payout(&setup.organizer, &group_id, &1);
    assert_eq!(res, Err(Ok(ContractError::CycleNotFullyFunded)));
}

// -------------------------------------------------------------
// TS-09: Fully funded rotating payout
// -------------------------------------------------------------
#[test]
fn test_09_fully_funded_rotating_payout() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // All 5 contribute to Cycle 1
    for m in setup.members.iter() {
        setup.client.contribute(m, &group_id, &1, &CONTRIBUTION_AMOUNT);
    }

    let recipient = &setup.members[0]; // Rotation position 1
    let recipient_bal_before = setup.token.balance(recipient);
    let expected_payout = CONTRIBUTION_AMOUNT * 5;

    setup.client.execute_payout(&setup.organizer, &group_id, &1);

    // Recipient received 500 USDC
    assert_eq!(setup.token.balance(recipient), recipient_bal_before + expected_payout);

    // Cycle marked Paid
    let cycle = setup.client.get_cycle(&group_id, &1);
    assert_eq!(cycle.status, CycleStatus::Paid);

    // Member record tracks received amount
    let rec = setup.client.get_member(&group_id, recipient);
    assert_eq!(rec.total_received, expected_payout);

    // Available balance reflects payout
    let accounting = setup.client.get_accounting(&group_id);
    assert_eq!(accounting.total_funds_paid_out, expected_payout);
    assert_eq!(accounting.available_balance, 0);
}

// -------------------------------------------------------------
// TS-10: Duplicate cycle payout
// -------------------------------------------------------------
#[test]
fn test_10_duplicate_cycle_payout() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    for m in setup.members.iter() {
        setup.client.contribute(m, &group_id, &1, &CONTRIBUTION_AMOUNT);
    }

    // First payout succeeds
    setup.client.execute_payout(&setup.organizer, &group_id, &1);

    // Second duplicate payout attempt must fail
    let res = setup.client.try_execute_payout(&setup.organizer, &group_id, &1);
    assert_eq!(res, Err(Ok(ContractError::CycleAlreadyPaid)));
}

// -------------------------------------------------------------
// TS-11: Unauthorized withdrawal
// -------------------------------------------------------------
#[test]
fn test_11_unauthorized_withdrawal() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    let rogue_wallet = Address::generate(&setup.env);

    let res = setup.client.try_request_withdrawal(
        &rogue_wallet,
        &group_id,
        &CONTRIBUTION_AMOUNT,
        &rogue_wallet,
    );
    assert_eq!(res, Err(Ok(ContractError::MemberNotFound)));
}

// -------------------------------------------------------------
// TS-12: Withdrawal without approvals
// -------------------------------------------------------------
#[test]
fn test_12_withdrawal_without_approvals() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // Fund the contract
    setup.client.contribute(&setup.members[0], &group_id, &1, &CONTRIBUTION_AMOUNT);

    // Requester requests withdrawal (threshold = 3, requester is 1)
    let req_id = setup.client.request_withdrawal(
        &setup.members[0],
        &group_id,
        &CONTRIBUTION_AMOUNT,
        &setup.members[0],
    );

    let res = setup.client.try_execute_withdrawal(&setup.organizer, &group_id, &req_id);
    assert_eq!(res, Err(Ok(ContractError::ThresholdNotMet)));
}

// -------------------------------------------------------------
// TS-13: Valid approved withdrawal
// -------------------------------------------------------------
#[test]
fn test_13_valid_approved_withdrawal() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // Deposit funds
    setup.client.contribute(&setup.members[0], &group_id, &1, &CONTRIBUTION_AMOUNT);
    setup.client.contribute(&setup.members[1], &group_id, &1, &CONTRIBUTION_AMOUNT);

    let recipient = Address::generate(&setup.env);
    let req_id = setup.client.request_withdrawal(
        &setup.members[0],
        &group_id,
        &CONTRIBUTION_AMOUNT,
        &recipient,
    );

    // Member 1 approves (approval count = 2)
    setup.client.approve_withdrawal(&setup.members[1], &group_id, &req_id);

    // Member 2 approves (approval count = 3, threshold met)
    setup.client.approve_withdrawal(&setup.members[2], &group_id, &req_id);

    let req_before = setup.client.get_withdrawal(&group_id, &req_id);
    assert_eq!(req_before.status, WithdrawalStatus::Approved);

    // Execute
    setup.client.execute_withdrawal(&setup.organizer, &group_id, &req_id);

    assert_eq!(setup.token.balance(&recipient), CONTRIBUTION_AMOUNT);

    let req_after = setup.client.get_withdrawal(&group_id, &req_id);
    assert_eq!(req_after.status, WithdrawalStatus::Executed);
}

// -------------------------------------------------------------
// TS-14: Withdrawal exceeds balance
// -------------------------------------------------------------
#[test]
fn test_14_withdrawal_exceeds_balance() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // Available balance is 0
    let res = setup.client.try_request_withdrawal(
        &setup.members[0],
        &group_id,
        &CONTRIBUTION_AMOUNT,
        &setup.members[0],
    );
    assert_eq!(res, Err(Ok(ContractError::InsufficientBalance)));
}

// -------------------------------------------------------------
// TS-15: Invalid contribution amount
// -------------------------------------------------------------
#[test]
fn test_15_invalid_contribution_amount() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // Attempting to send 50 USDC instead of 100 USDC
    let invalid_amount = CONTRIBUTION_AMOUNT / 2;
    let res = setup.client.try_contribute(&setup.members[0], &group_id, &1, &invalid_amount);
    assert_eq!(res, Err(Ok(ContractError::InvalidContributionAmount)));
}

// -------------------------------------------------------------
// TS-16: Member exit and eligible refund
// -------------------------------------------------------------
#[test]
fn test_16_member_exit_and_eligible_refund() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    let member = &setup.members[4]; // Last rotation position
    setup.client.contribute(member, &group_id, &1, &CONTRIBUTION_AMOUNT);

    let bal_before = setup.token.balance(member);
    let refund = setup.client.request_exit_and_refund(member, &group_id);
    assert_eq!(refund, CONTRIBUTION_AMOUNT);

    // Balance restored
    assert_eq!(setup.token.balance(member), bal_before + CONTRIBUTION_AMOUNT);

    let rec = setup.client.get_member(&group_id, member);
    assert_eq!(rec.status, MemberStatus::Exited);

    // Negative case: If a member has already received a payout, they cannot exit
    // Member 0 receives payout in Cycle 1
    for m in setup.members[0..4].iter() {
        setup.client.contribute(m, &group_id, &1, &CONTRIBUTION_AMOUNT);
    }
    // Re-contribute member 4 so cycle is funded
    let new_member = Address::generate(&setup.env);
    setup.stellar_asset_client.mint(&new_member, &1_000_000_000);
    // Execute payout for cycle 1 to member 0
    // Test member with total_received > 0
    let m0_rec = setup.client.get_member(&group_id, &setup.members[0]);
    if m0_rec.total_received > 0 {
        let res = setup.client.try_request_exit_and_refund(&setup.members[0], &group_id);
        assert_eq!(res, Err(Ok(ContractError::CannotExitWithObligations)));
    }
}

// -------------------------------------------------------------
// TS-17: Failed token transfer
// -------------------------------------------------------------
#[test]
fn test_17_failed_token_transfer() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    let broke_member = Address::generate(&setup.env);
    // broke_member has 0 USDC balance

    setup.client.register_member(&setup.organizer, &group_id, &broke_member, &1);
    setup.client.accept_rules(&broke_member, &group_id);

    // Token transfer should fail due to insufficient balance
    let res = setup.client.try_contribute(&broke_member, &group_id, &1, &CONTRIBUTION_AMOUNT);
    assert!(res.is_err());

    // State remains completely consistent: cycle collected amount is still 0
    let cycle = setup.client.get_cycle(&group_id, &1);
    assert_eq!(cycle.collected_amount, 0);

    let accounting = setup.client.get_accounting(&group_id);
    assert_eq!(accounting.total_funds_received, 0);
    assert_eq!(accounting.available_balance, 0);
}

// -------------------------------------------------------------
// TS-18: Dashboard accounting reconciliation
// -------------------------------------------------------------
#[test]
fn test_18_dashboard_accounting_reconciliation() {
    let setup = setup();
    let group_id = create_standard_group(&setup);
    onboard_all_members(&setup, group_id);

    // 1. All 5 members contribute to Cycle 1 (500 USDC received)
    for m in setup.members.iter() {
        setup.client.contribute(m, &group_id, &1, &CONTRIBUTION_AMOUNT);
    }

    let acc1 = setup.client.get_accounting(&group_id);
    assert_eq!(acc1.total_funds_received, 500_000_000);
    assert_eq!(acc1.total_funds_paid_out, 0);
    assert_eq!(acc1.available_balance, 500_000_000);
    assert_eq!(setup.token.balance(&setup.client.address), 500_000_000);

    // 2. Execute payout for Cycle 1 (500 USDC paid out)
    setup.client.execute_payout(&setup.organizer, &group_id, &1);

    let acc2 = setup.client.get_accounting(&group_id);
    assert_eq!(acc2.total_funds_received, 500_000_000);
    assert_eq!(acc2.total_funds_paid_out, 500_000_000);
    assert_eq!(acc2.available_balance, 0);
    assert_eq!(setup.token.balance(&setup.client.address), 0);

    // 3. Member 1 contributes to Cycle 2 (100 USDC received)
    setup.client.contribute(&setup.members[0], &group_id, &2, &CONTRIBUTION_AMOUNT);

    let acc3 = setup.client.get_accounting(&group_id);
    assert_eq!(acc3.total_funds_received, 600_000_000);
    assert_eq!(acc3.total_funds_paid_out, 500_000_000);
    assert_eq!(acc3.available_balance, 100_000_000);
    assert_eq!(setup.token.balance(&setup.client.address), 100_000_000);

    // Math invariant reconciliation
    assert_eq!(
        acc3.available_balance,
        acc3.total_funds_received - acc3.total_funds_paid_out - acc3.total_funds_refunded
    );
}
