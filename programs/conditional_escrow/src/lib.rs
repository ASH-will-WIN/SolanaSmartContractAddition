use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};

declare_id!("B3bW1RfHFGNZG1PDZkPukpBQnDWE2yLmUuk2StqHgMK7");

#[program]
pub mod conditional_escrow {
    use super::*;
    pub fn initialize_config(ctx: Context<InitializeConfig>, verifier: Pubkey) -> Result<()> {
        ctx.accounts.config.set_inner(Config { authority: ctx.accounts.authority.key(), verifier, bump: ctx.bumps.config }); Ok(())
    }
    pub fn set_verifier(ctx: Context<SetVerifier>, verifier: Pubkey) -> Result<()> { ctx.accounts.config.verifier = verifier; Ok(()) }
    pub fn create_deal(ctx: Context<CreateDeal>, deal_id: u64, recipient: Pubkey, condition_id: [u8; 32], amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, EscrowError::InvalidAmount);
        ctx.accounts.deal.set_inner(Deal { deal_id, creator: ctx.accounts.creator.key(), recipient, condition_id, amount_lamports, condition_result: false, has_result: false, funded: false, released: false, bump: ctx.bumps.deal }); Ok(())
    }
    pub fn fund_deal(ctx: Context<FundDeal>, amount_lamports: u64) -> Result<()> {
        let deal = &mut ctx.accounts.deal;
        require!(!deal.funded, EscrowError::AlreadyFunded); require!(amount_lamports == deal.amount_lamports, EscrowError::InvalidAmount);
        let ix = system_instruction::transfer(&ctx.accounts.creator.key(), &ctx.accounts.escrow.key(), amount_lamports);
        anchor_lang::solana_program::program::invoke(&ix, &[ctx.accounts.creator.to_account_info(), ctx.accounts.escrow.to_account_info(), ctx.accounts.system_program.to_account_info()])?;
        deal.funded = true; Ok(())
    }
    pub fn submit_condition_result(ctx: Context<SubmitConditionResult>, condition_id: [u8; 32], result: bool) -> Result<()> {
        let deal = &mut ctx.accounts.deal;
        require!(ctx.accounts.config.verifier == ctx.accounts.verifier.key(), EscrowError::UnauthorizedVerifier); require!(!deal.released, EscrowError::AlreadyReleased); require!(deal.condition_id == condition_id, EscrowError::WrongCondition);
        deal.condition_result = result; deal.has_result = true;
        emit!(ConditionResultSubmitted { deal_id: deal.deal_id, condition_id, result, verifier: ctx.accounts.verifier.key() }); Ok(())
    }
    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        let deal = &mut ctx.accounts.deal;
        require!(deal.funded, EscrowError::NotFunded); require!(deal.has_result, EscrowError::MissingConditionResult); require!(deal.condition_result, EscrowError::ConditionFalse); require!(!deal.released, EscrowError::AlreadyReleased); require!(ctx.accounts.escrow.lamports() >= deal.amount_lamports, EscrowError::InsufficientEscrow);
        let deal_key = deal.key(); let seeds: &[&[u8]] = &[b"escrow", deal_key.as_ref(), &[ctx.bumps.escrow]];
        let ix = system_instruction::transfer(&ctx.accounts.escrow.key(), &ctx.accounts.recipient.key(), deal.amount_lamports);
        invoke_signed(&ix, &[ctx.accounts.escrow.to_account_info(), ctx.accounts.recipient.to_account_info(), ctx.accounts.system_program.to_account_info()], &[seeds])?;
        deal.released = true; emit!(PaymentReleased { deal_id: deal.deal_id, recipient: deal.recipient, amount_lamports: deal.amount_lamports }); Ok(())
    }
}
#[derive(Accounts)]
pub struct InitializeConfig<'info> { #[account(init, payer = authority, space = 8 + 32 + 32 + 1, seeds = [b"config"], bump)] pub config: Account<'info, Config>, #[account(mut)] pub authority: Signer<'info>, pub system_program: Program<'info, System> }
#[derive(Accounts)]
pub struct SetVerifier<'info> { #[account(mut, seeds = [b"config"], bump = config.bump, has_one = authority)] pub config: Account<'info, Config>, pub authority: Signer<'info> }
#[derive(Accounts)]
#[instruction(deal_id: u64)]
pub struct CreateDeal<'info> { #[account(init, payer = creator, space = 8 + 8 + 32 + 32 + 32 + 8 + 4 + 1, seeds = [b"deal".as_ref(), &deal_id.to_le_bytes()], bump)] pub deal: Account<'info, Deal>, #[account(mut)] pub creator: Signer<'info>, pub system_program: Program<'info, System> }
#[derive(Accounts)]
pub struct FundDeal<'info> { #[account(mut, has_one = creator)] pub deal: Account<'info, Deal>, /// CHECK: Seed-constrained system account used only as an escrow PDA.
#[account(mut, seeds = [b"escrow", deal.key().as_ref()], bump)] pub escrow: UncheckedAccount<'info>, #[account(mut)] pub creator: Signer<'info>, pub system_program: Program<'info, System> }
#[derive(Accounts)]
pub struct SubmitConditionResult<'info> { #[account(seeds = [b"config"], bump = config.bump)] pub config: Account<'info, Config>, #[account(mut)] pub deal: Account<'info, Deal>, pub verifier: Signer<'info> }
#[derive(Accounts)]
pub struct ReleasePayment<'info> { #[account(mut)] pub deal: Account<'info, Deal>, /// CHECK: PDA is constrained and signs the system transfer.
#[account(mut, seeds = [b"escrow", deal.key().as_ref()], bump)] pub escrow: UncheckedAccount<'info>, /// CHECK: Address must equal recipient stored in deal.
#[account(mut, address = deal.recipient)] pub recipient: UncheckedAccount<'info>, pub caller: Signer<'info>, pub system_program: Program<'info, System> }
#[account]
pub struct Config { pub authority: Pubkey, pub verifier: Pubkey, pub bump: u8 }
#[account]
pub struct Deal { pub deal_id: u64, pub creator: Pubkey, pub recipient: Pubkey, pub condition_id: [u8; 32], pub amount_lamports: u64, pub condition_result: bool, pub has_result: bool, pub funded: bool, pub released: bool, pub bump: u8 }
#[event]
pub struct ConditionResultSubmitted { pub deal_id: u64, pub condition_id: [u8; 32], pub result: bool, pub verifier: Pubkey }
#[event]
pub struct PaymentReleased { pub deal_id: u64, pub recipient: Pubkey, pub amount_lamports: u64 }
#[error_code]
pub enum EscrowError { #[msg("Only configured verifier may submit results")] UnauthorizedVerifier, #[msg("Condition ID does not match deal")] WrongCondition, #[msg("Deal is already funded")] AlreadyFunded, #[msg("Funding amount must equal deal amount")] InvalidAmount, #[msg("Deal is not funded")] NotFunded, #[msg("No condition result submitted")] MissingConditionResult, #[msg("Condition result is false")] ConditionFalse, #[msg("Payment already released")] AlreadyReleased, #[msg("Escrow balance is insufficient")] InsufficientEscrow }
