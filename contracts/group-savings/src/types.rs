use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GroupStatus {
    Active = 1,
    Paused = 2,
    Completed = 3,
    Dissolved = 4,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MemberStatus {
    Invited = 1,
    Active = 2,
    ExitRequested = 3,
    Exited = 4,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum CycleStatus {
    Upcoming = 1,
    Pending = 2,
    Funded = 3,
    Paid = 4,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum WithdrawalStatus {
    Pending = 1,
    Approved = 2,
    Executed = 3,
    Rejected = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GroupConfig {
    pub name: String,
    pub usdc_token: Address,
    pub organizer: Address,
    pub contribution_amount: i128,
    pub total_members: u32,
    pub cycle_duration_ledgers: u32,
    pub approval_threshold: u32,
    pub status: GroupStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberRecord {
    pub address: Address,
    pub status: MemberStatus,
    pub rules_accepted: bool,
    pub total_contributed: i128,
    pub total_received: i128,
    pub rotation_position: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CycleRecord {
    pub cycle_index: u32,
    pub recipient: Address,
    pub target_amount: i128,
    pub collected_amount: i128,
    pub status: CycleStatus,
    pub paid_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GroupAccounting {
    pub total_funds_received: i128,
    pub total_funds_paid_out: i128,
    pub total_funds_refunded: i128,
    pub available_balance: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawalRequest {
    pub request_id: u32,
    pub requester: Address,
    pub recipient: Address,
    pub amount: i128,
    pub approval_count: u32,
    pub status: WithdrawalStatus,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    GroupConfig(u32),
    GroupMembers(u32),
    Member(u32, Address),
    Cycle(u32, u32),
    CycleMemberPaid(u32, u32, Address),
    Accounting(u32),
    Withdrawal(u32, u32),
    WithdrawalApproval(u32, u32, Address),
    NextWithdrawalId(u32),
    GroupCount,
}
