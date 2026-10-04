# Conditional Escrow MVP

A small, devnet-only proof of this flow:

`fake platform result → centralized verifier transaction → Anchor condition state → native SOL escrow release`

It uses **test SOL on Solana devnet only**. It is not a trustless oracle and does not use mainnet, real money, SPL tokens, banking, AI, or evidence analysis.

## Setup

Prerequisites: Node 20+, npm, Rust, Solana CLI, and Anchor CLI 0.30.x. Create three local keypairs and fund payer/verifier on devnet:

```bash
solana-keygen new --outfile keypairs/payer-devnet.json
solana-keygen new --outfile keypairs/verifier-devnet.json
solana-keygen new --outfile keypairs/recipient-devnet.json
solana config set --url devnet
solana airdrop 2 "$(solana-keygen pubkey keypairs/payer-devnet.json)"
solana airdrop 1 "$(solana-keygen pubkey keypairs/verifier-devnet.json)"
cp .env.example .env.local
```

Fill each absolute keypair path in `.env.local`. These files are ignored by Git. Never place a private key in a `NEXT_PUBLIC_*` variable.

## Deploy

The program ID is deliberately a placeholder until your first build. Generate a deployment keypair, then use its public key consistently in the three locations below:

```bash
anchor keys list
# replace declare_id! in programs/conditional_escrow/src/lib.rs
# replace both conditional_escrow IDs in Anchor.toml
anchor build --no-idl
anchor deploy --provider.cluster devnet
```

This scaffold pins the lockfile and several transitive crates for compatibility with Anchor's Cargo 1.75 SBF toolchain. Use `--no-idl` with this older Anchor toolchain; the web client intentionally uses a small manual instruction client and does not require a generated IDL. If a newer local Cargo rewrites the first lockfile line to `version = 4`, change it back to `version = 3` before running `anchor build --no-idl`.

Set the deployed address as `PROGRAM_ID` in `.env.local`. The API rejects RPC URLs that do not include `devnet`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Create and fund the 0.1 SOL deal, set FALSE, run verification, and observe release fail. Then set TRUE, verify again, release, and open the displayed devnet Explorer links.

## Tests

```bash
npm run test:backend
anchor test
```

The Anchor suite uses Anchor's local validator/test SOL for deterministic contract tests; deployment and the web demo use devnet. It covers config, creation, funding, unauthorized and wrong-condition results, false/true updates, release guards, recipient balance, double release, and unfunded release.

## Architecture

- **Fake platform:** process-local demo state selected through the UI. `verifyCondition()` returns the current state only for the active deal/condition.
- **Verifier:** a centralized, server-side service. It calls the fake platform itself, then signs `submit_condition_result` using `VERIFIER_KEYPAIR_PATH`.
- **Program:** stores a verifier-controlled result in a deal PDA and releases the exact stored amount from its escrow PDA only after a true result.
- **Frontend:** calls API routes only; it has no private key and never sends a result directly to Solana.

## Intentionally omitted

Real evidence verification, AI/document/image analysis, custom attestations, wallet connections, SPL/stablecoins, banking, mainnet, multi-party oracles, deal persistence/database, and production key management are intentionally out of scope.
