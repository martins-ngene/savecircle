#![no_std]

mod errors;
mod events;
mod types;

#[cfg(test)]
mod test;

use errors::ContractError;
use events::*;
use types::*;

use soroban_sdk::{
    contract, contractimpl, token, Address, Env, String, Vec,
};

#[contract]
pub struct GroupSavingsContract;

#[contractimpl]
impl GroupSavingsContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::GroupCount, &0u32);
        Ok(())
    }

    /// Create a new savings group with configuration
    pub fn create_group(
        env: Env,
        organizer: Address,
        name: String,
        usdc_token: Address,
        contribution_amount: i128,
        total_members: u32,
        cycle_duration_ledgers: u32,
        approval_threshold: u32,
    ) -> Result<u32, ContractError> {
        organizer.require_auth();

        if contribution_amount <= 0 || total_members == 0 || approval_threshold == 0 || approval_threshold > total_members {
            return Err(ContractError::InvalidConfig);
        }

        let mut group_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GroupCount)
            .unwrap_or(0);

        group_count += 1;
        let group_id = group_count;

        let config = GroupConfig {
            name,
            usdc_token,
            organizer: organizer.clone(),
            contribution_amount,
            total_members,
            cycle_duration_ledgers,
            approval_threshold,
            status: GroupStatus::Active,
        };

        let accounting = GroupAccounting {
            total_funds_received: 0,
            total_funds_paid_out: 0,
            total_funds_refunded: 0,
            available_balance: 0,
        };

        env.storage().instance().set(&DataKey::GroupCount, &group_count);
        env.storage().persistent().set(&DataKey::GroupConfig(group_id), &config);
        env.storage().persistent().set(&DataKey::Accounting(group_id), &accounting);
        let empty_members: Vec<Address> = Vec::new(&env);
        env.storage().persistent().set(&DataKey::GroupMembers(group_id), &empty_members);
        env.storage().persistent().set(&DataKey::NextWithdrawalId(group_id), &1u32);

        // Pre-initialize cycle records
        let target_pool = contribution_amount
            .checked_mul(total_members as i128)
            .ok_or(ContractError::InvalidConfig)?;

        for cycle_idx in 1..=total_members {
            let cycle = CycleRecord {
                cycle_index: cycle_idx,
                recipient: organizer.clone(), // will be updated as members register with their rotation position
                target_amount: target_pool,
                collected_amount: 0,
                status: CycleStatus::Upcoming,
                paid_at_ledger: 0,
            };
            env.storage().persistent().set(&DataKey::Cycle(group_id, cycle_idx), &cycle);
        }

        emit_group_created(&env, group_id, &organizer);
        Ok(group_id)
    }

    /// Register an authorized member to a group with their rotation order
    pub fn register_member(
        env: Env,
        organizer: Address,
        group_id: u32,
        member: Address,
        rotation_position: u32,
    ) -> Result<(), ContractError> {
        let config: GroupConfig = env
            .storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        if config.organizer != organizer {
            return Err(ContractError::NotAuthorized);
        }
        organizer.require_auth();

        if config.status != GroupStatus::Active {
            return Err(ContractError::GroupNotActive);
        }

        if rotation_position == 0 || rotation_position > config.total_members {
            return Err(ContractError::InvalidConfig);
        }

        if env.storage().persistent().has(&DataKey::Member(group_id, member.clone())) {
            return Err(ContractError::MemberAlreadyRegistered);
        }

        let mut members: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::GroupMembers(group_id))
            .unwrap_or(Vec::new(&env));

        if members.len() >= config.total_members {
            return Err(ContractError::MaxMembersReached);
        }

        // Check duplicate rotation position
        for i in 0..members.len() {
            let existing_addr = members.get(i).unwrap();
            if let Some(existing_rec) = env.storage().persistent().get::<DataKey, MemberRecord>(&DataKey::Member(group_id, existing_addr)) {
                if existing_rec.rotation_position == rotation_position {
                    return Err(ContractError::InvalidConfig);
                }
            }
        }

        let member_record = MemberRecord {
            address: member.clone(),
            status: MemberStatus::Invited,
            rules_accepted: false,
            total_contributed: 0,
            total_received: 0,
            rotation_position,
        };

        members.push_back(member.clone());
        env.storage().persistent().set(&DataKey::GroupMembers(group_id), &members);
        env.storage().persistent().set(&DataKey::Member(group_id, member.clone()), &member_record);

        // Update cycle recipient for this rotation position
        if let Some(mut cycle) = env.storage().persistent().get::<DataKey, CycleRecord>(&DataKey::Cycle(group_id, rotation_position)) {
            cycle.recipient = member.clone();
            env.storage().persistent().set(&DataKey::Cycle(group_id, rotation_position), &cycle);
        }

        emit_member_registered(&env, group_id, &member, rotation_position);
        Ok(())
    }

    /// Member accepts group rules to activate their membership
    pub fn accept_rules(env: Env, member: Address, group_id: u32) -> Result<(), ContractError> {
        member.require_auth();

        let mut record: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, member.clone()))
            .ok_or(ContractError::MemberNotFound)?;

        record.rules_accepted = true;
        record.status = MemberStatus::Active;

        env.storage().persistent().set(&DataKey::Member(group_id, member.clone()), &record);
        emit_rules_accepted(&env, group_id, &member);
        Ok(())
    }

    /// Contribute USDC tokens to a specific cycle
    pub fn contribute(
        env: Env,
        member: Address,
        group_id: u32,
        cycle_index: u32,
        amount: i128,
    ) -> Result<(), ContractError> {
        member.require_auth();

        let config: GroupConfig = env
            .storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        if config.status != GroupStatus::Active {
            return Err(ContractError::GroupNotActive);
        }

        let mut member_record: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, member.clone()))
            .ok_or(ContractError::MemberNotFound)?;

        if !member_record.rules_accepted || member_record.status != MemberStatus::Active {
            return Err(ContractError::RulesNotAccepted);
        }

        if amount != config.contribution_amount {
            return Err(ContractError::InvalidContributionAmount);
        }

        let mut cycle: CycleRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Cycle(group_id, cycle_index))
            .ok_or(ContractError::CycleNotFound)?;

        if cycle.status == CycleStatus::Paid {
            return Err(ContractError::CycleAlreadyPaid);
        }

        let has_paid: bool = env
            .storage()
            .persistent()
            .get(&DataKey::CycleMemberPaid(group_id, cycle_index, member.clone()))
            .unwrap_or(false);

        if has_paid {
            return Err(ContractError::CycleMemberAlreadyPaid);
        }

        // Transfer tokens from member to contract escrow
        let token_client = token::Client::new(&env, &config.usdc_token);
        token_client.transfer(&member, &env.current_contract_address(), &amount);

        // Update state
        env.storage().persistent().set(&DataKey::CycleMemberPaid(group_id, cycle_index, member.clone()), &true);

        cycle.collected_amount += amount;
        if cycle.collected_amount >= cycle.target_amount {
            cycle.status = CycleStatus::Funded;
            emit_cycle_funded(&env, group_id, cycle_index, cycle.target_amount);
        } else {
            cycle.status = CycleStatus::Pending;
        }
        env.storage().persistent().set(&DataKey::Cycle(group_id, cycle_index), &cycle);

        member_record.total_contributed += amount;
        env.storage().persistent().set(&DataKey::Member(group_id, member.clone()), &member_record);

        let mut accounting: GroupAccounting = env
            .storage()
            .persistent()
            .get(&DataKey::Accounting(group_id))
            .unwrap_or(GroupAccounting {
                total_funds_received: 0,
                total_funds_paid_out: 0,
                total_funds_refunded: 0,
                available_balance: 0,
            });

        accounting.total_funds_received += amount;
        accounting.available_balance += amount;
        env.storage().persistent().set(&DataKey::Accounting(group_id), &accounting);

        emit_contribution(&env, group_id, cycle_index, &member, amount);
        Ok(())
    }

    /// Execute authorized payout for a fully funded cycle
    pub fn execute_payout(
        env: Env,
        caller: Address,
        group_id: u32,
        cycle_index: u32,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let config: GroupConfig = env
            .storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        let mut cycle: CycleRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Cycle(group_id, cycle_index))
            .ok_or(ContractError::CycleNotFound)?;

        if cycle.status == CycleStatus::Paid {
            return Err(ContractError::CycleAlreadyPaid);
        }

        if cycle.collected_amount < cycle.target_amount {
            return Err(ContractError::CycleNotFullyFunded);
        }

        let mut recipient_record: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, cycle.recipient.clone()))
            .ok_or(ContractError::MemberNotFound)?;

        if recipient_record.status != MemberStatus::Active {
            return Err(ContractError::MemberNotActive);
        }

        let mut accounting: GroupAccounting = env
            .storage()
            .persistent()
            .get(&DataKey::Accounting(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        let payout_amount = cycle.target_amount;
        if accounting.available_balance < payout_amount {
            return Err(ContractError::InsufficientBalance);
        }

        // Prevent duplicate payout: transition state before external token transfer
        cycle.status = CycleStatus::Paid;
        cycle.paid_at_ledger = env.ledger().sequence();
        env.storage().persistent().set(&DataKey::Cycle(group_id, cycle_index), &cycle);

        recipient_record.total_received += payout_amount;
        env.storage().persistent().set(&DataKey::Member(group_id, cycle.recipient.clone()), &recipient_record);

        accounting.available_balance -= payout_amount;
        accounting.total_funds_paid_out += payout_amount;
        env.storage().persistent().set(&DataKey::Accounting(group_id), &accounting);

        // Transfer funds to recipient
        let token_client = token::Client::new(&env, &config.usdc_token);
        token_client.transfer(&env.current_contract_address(), &cycle.recipient, &payout_amount);

        emit_payout_executed(&env, group_id, cycle_index, &cycle.recipient, payout_amount);
        Ok(())
    }

    /// Request a multi-member protected withdrawal
    pub fn request_withdrawal(
        env: Env,
        requester: Address,
        group_id: u32,
        amount: i128,
        recipient: Address,
    ) -> Result<u32, ContractError> {
        requester.require_auth();

        let config: GroupConfig = env
            .storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        let member_record: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, requester.clone()))
            .ok_or(ContractError::MemberNotFound)?;

        if member_record.status != MemberStatus::Active {
            return Err(ContractError::MemberNotActive);
        }

        if amount <= 0 {
            return Err(ContractError::ZeroAmount);
        }

        let accounting: GroupAccounting = env
            .storage()
            .persistent()
            .get(&DataKey::Accounting(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        if amount > accounting.available_balance {
            return Err(ContractError::InsufficientBalance);
        }

        let mut next_id: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NextWithdrawalId(group_id))
            .unwrap_or(1);

        let request_id = next_id;
        next_id += 1;
        env.storage().persistent().set(&DataKey::NextWithdrawalId(group_id), &next_id);

        let status = if config.approval_threshold <= 1 {
            WithdrawalStatus::Approved
        } else {
            WithdrawalStatus::Pending
        };

        let request = WithdrawalRequest {
            request_id,
            requester: requester.clone(),
            recipient: recipient.clone(),
            amount,
            approval_count: 1,
            status,
        };

        env.storage().persistent().set(&DataKey::Withdrawal(group_id, request_id), &request);
        env.storage().persistent().set(&DataKey::WithdrawalApproval(group_id, request_id, requester.clone()), &true);

        emit_withdrawal_requested(&env, group_id, request_id, &requester, amount);
        Ok(request_id)
    }

    /// Approve a pending withdrawal request
    pub fn approve_withdrawal(
        env: Env,
        approver: Address,
        group_id: u32,
        request_id: u32,
    ) -> Result<(), ContractError> {
        approver.require_auth();

        let config: GroupConfig = env
            .storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        let member_record: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, approver.clone()))
            .ok_or(ContractError::MemberNotFound)?;

        if member_record.status != MemberStatus::Active {
            return Err(ContractError::MemberNotActive);
        }

        let mut request: WithdrawalRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Withdrawal(group_id, request_id))
            .ok_or(ContractError::WithdrawalNotFound)?;

        if request.status != WithdrawalStatus::Pending {
            return Err(ContractError::WithdrawalAlreadyProcessed);
        }

        let already_approved: bool = env
            .storage()
            .persistent()
            .get(&DataKey::WithdrawalApproval(group_id, request_id, approver.clone()))
            .unwrap_or(false);

        if already_approved {
            return Err(ContractError::AlreadyApproved);
        }

        env.storage().persistent().set(&DataKey::WithdrawalApproval(group_id, request_id, approver.clone()), &true);
        request.approval_count += 1;

        if request.approval_count >= config.approval_threshold {
            request.status = WithdrawalStatus::Approved;
        }

        env.storage().persistent().set(&DataKey::Withdrawal(group_id, request_id), &request);
        emit_withdrawal_approved(&env, group_id, request_id, &approver);
        Ok(())
    }

    /// Execute an approved withdrawal request
    pub fn execute_withdrawal(
        env: Env,
        caller: Address,
        group_id: u32,
        request_id: u32,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let config: GroupConfig = env
            .storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        let mut request: WithdrawalRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Withdrawal(group_id, request_id))
            .ok_or(ContractError::WithdrawalNotFound)?;

        if request.status != WithdrawalStatus::Approved {
            return Err(ContractError::ThresholdNotMet);
        }

        let mut accounting: GroupAccounting = env
            .storage()
            .persistent()
            .get(&DataKey::Accounting(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        if request.amount > accounting.available_balance {
            return Err(ContractError::InsufficientBalance);
        }

        // Set status to Executed
        request.status = WithdrawalStatus::Executed;
        env.storage().persistent().set(&DataKey::Withdrawal(group_id, request_id), &request);

        accounting.available_balance -= request.amount;
        accounting.total_funds_paid_out += request.amount;
        env.storage().persistent().set(&DataKey::Accounting(group_id), &accounting);

        let token_client = token::Client::new(&env, &config.usdc_token);
        token_client.transfer(&env.current_contract_address(), &request.recipient, &request.amount);

        emit_withdrawal_executed(&env, group_id, request_id, &request.recipient, request.amount);
        Ok(())
    }

    /// Member exit request and eligible refund calculation
    pub fn request_exit_and_refund(
        env: Env,
        member: Address,
        group_id: u32,
    ) -> Result<i128, ContractError> {
        member.require_auth();

        let config: GroupConfig = env
            .storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        let mut member_record: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, member.clone()))
            .ok_or(ContractError::MemberNotFound)?;

        // If member already received a rotating payout, they cannot exit leaving obligations
        if member_record.total_received > 0 {
            return Err(ContractError::CannotExitWithObligations);
        }

        let mut accounting: GroupAccounting = env
            .storage()
            .persistent()
            .get(&DataKey::Accounting(group_id))
            .ok_or(ContractError::GroupNotFound)?;

        // Eligible refund is their total contributed amount
        let eligible_refund = member_record.total_contributed;
        if eligible_refund > 0 {
            if eligible_refund > accounting.available_balance {
                return Err(ContractError::InsufficientBalance);
            }

            accounting.available_balance -= eligible_refund;
            accounting.total_funds_refunded += eligible_refund;
            env.storage().persistent().set(&DataKey::Accounting(group_id), &accounting);

            let token_client = token::Client::new(&env, &config.usdc_token);
            token_client.transfer(&env.current_contract_address(), &member, &eligible_refund);
        }

        member_record.status = MemberStatus::Exited;
        env.storage().persistent().set(&DataKey::Member(group_id, member.clone()), &member_record);

        emit_refund_processed(&env, group_id, &member, eligible_refund);
        Ok(eligible_refund)
    }

    // -------------------------------------------------------------
    // Query / View Functions
    // -------------------------------------------------------------

    pub fn get_group(env: Env, group_id: u32) -> Result<GroupConfig, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::GroupConfig(group_id))
            .ok_or(ContractError::GroupNotFound)
    }

    pub fn get_member(env: Env, group_id: u32, member: Address) -> Result<MemberRecord, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Member(group_id, member))
            .ok_or(ContractError::MemberNotFound)
    }

    pub fn get_cycle(env: Env, group_id: u32, cycle_index: u32) -> Result<CycleRecord, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Cycle(group_id, cycle_index))
            .ok_or(ContractError::CycleNotFound)
    }

    pub fn get_accounting(env: Env, group_id: u32) -> Result<GroupAccounting, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Accounting(group_id))
            .ok_or(ContractError::GroupNotFound)
    }

    pub fn get_withdrawal(env: Env, group_id: u32, request_id: u32) -> Result<WithdrawalRequest, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Withdrawal(group_id, request_id))
            .ok_or(ContractError::WithdrawalNotFound)
    }

    pub fn has_member_paid_cycle(env: Env, group_id: u32, cycle_index: u32, member: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::CycleMemberPaid(group_id, cycle_index, member))
            .unwrap_or(false)
    }
}
