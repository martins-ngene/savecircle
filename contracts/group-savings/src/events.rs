#![allow(deprecated)]
use soroban_sdk::{symbol_short, Address, Env};

pub fn emit_group_created(env: &Env, group_id: u32, organizer: &Address) {
    env.events().publish(
        (symbol_short!("grp_crtd"), group_id),
        organizer.clone(),
    );
}

pub fn emit_member_registered(env: &Env, group_id: u32, member: &Address, position: u32) {
    env.events().publish(
        (symbol_short!("mbr_reg"), group_id),
        (member.clone(), position),
    );
}

pub fn emit_rules_accepted(env: &Env, group_id: u32, member: &Address) {
    env.events().publish(
        (symbol_short!("rls_acc"), group_id),
        member.clone(),
    );
}

pub fn emit_contribution(env: &Env, group_id: u32, cycle_index: u32, member: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("contrib"), group_id, cycle_index),
        (member.clone(), amount),
    );
}

pub fn emit_cycle_funded(env: &Env, group_id: u32, cycle_index: u32, target_amount: i128) {
    env.events().publish(
        (symbol_short!("cyc_fnd"), group_id, cycle_index),
        target_amount,
    );
}

pub fn emit_payout_executed(env: &Env, group_id: u32, cycle_index: u32, recipient: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("payout"), group_id, cycle_index),
        (recipient.clone(), amount),
    );
}

pub fn emit_withdrawal_requested(env: &Env, group_id: u32, request_id: u32, requester: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("wdr_req"), group_id, request_id),
        (requester.clone(), amount),
    );
}

pub fn emit_withdrawal_approved(env: &Env, group_id: u32, request_id: u32, approver: &Address) {
    env.events().publish(
        (symbol_short!("wdr_app"), group_id, request_id),
        approver.clone(),
    );
}

pub fn emit_withdrawal_executed(env: &Env, group_id: u32, request_id: u32, recipient: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("wdr_exec"), group_id, request_id),
        (recipient.clone(), amount),
    );
}

pub fn emit_refund_processed(env: &Env, group_id: u32, member: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("refund"), group_id),
        (member.clone(), amount),
    );
}
