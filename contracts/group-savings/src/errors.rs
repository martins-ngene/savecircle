use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
    GroupNotFound = 4,
    GroupNotActive = 5,
    GroupAlreadyExists = 6,
    MemberAlreadyRegistered = 7,
    MemberNotFound = 8,
    MemberNotActive = 9,
    RulesNotAccepted = 10,
    InvalidContributionAmount = 11,
    CycleNotFound = 12,
    CycleNotFullyFunded = 13,
    CycleAlreadyPaid = 14,
    CycleMemberAlreadyPaid = 15,
    InvalidRecipient = 16,
    InsufficientBalance = 17,
    WithdrawalNotFound = 18,
    WithdrawalAlreadyProcessed = 19,
    ThresholdNotMet = 20,
    AlreadyApproved = 21,
    CannotExitWithObligations = 22,
    ZeroAmount = 23,
    InvalidConfig = 24,
    MaxMembersReached = 25,
}
