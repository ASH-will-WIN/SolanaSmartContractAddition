# Conditional Escrow MVP

A small, devnet-only proof of this flow:

`mock construction checklist → platform-calculated condition → centralized verifier transaction → Anchor condition state → native SOL escrow release`

It uses **test SOL on Solana devnet only**. It is not a trustless oracle and does not use mainnet, real money, SPL tokens, banking, AI, or evidence analysis. The deployed Devnet program is `B3bW1RfHFGNZG1PDZkPukpBQnDWE2yLmUuk2StqHgMK7`.

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

Open `http://localhost:3000`. Create a **fresh** 0.001 SOL deal with `foundation_milestone_complete`; this amount keeps the escrow PDA rent-exempt while remaining small for demos. Existing deals have a fixed, older condition hash and cannot be reused for this demo. The payer must have sufficient Devnet SOL before you create and fund a deal. Each fresh deal also consumes account rent and transaction fees, so repeated live Devnet runs still consume payer balance beyond the escrow amount.

The checklist begins with all five checks incomplete. Its actions are deliberately mock/demo actions only: they do not upload files, inspect evidence, or obtain real approvals. The shown filenames and approval labels are mock metadata.

1. Mark any four checks complete and leave inspector approval incomplete.
2. Run verification: the centralized verifier independently reads the platform's current checklist, calculates `false`, and the program keeps payment locked.
3. Approve as inspector and run verification again. The verifier calculates `true` and records it on-chain.
4. The deal is now **ready to release**, not released. Click **Release Payment** as a separate explicit action, then open the Devnet Explorer links.

Checklist state is process-local memory indexed by deal ID and resets if the server restarts. It is intentionally not a database or production evidence store.

## Tests

```bash
npm run test:backend
anchor test
```

`npm run test:backend` uses mocks only: it does not contact Devnet, sign, or send transactions. It covers zero/four/all-five checklist states, unknown check rejection, per-deal state, verifier-controlled submission, false-to-true release eligibility, mock unauthorized submission, duplicate release, and stored payment amount.

The Anchor suite uses Anchor's local validator/test SOL for deterministic contract tests; deployment and the web demo use Devnet. In this environment, Anchor 0.30.1 IDL generation is blocked before tests run by `proc_macro2::Span::source_file()`; use `anchor build --no-idl` for the existing deployment and do not report that suite as passing until that toolchain issue is resolved.

## Architecture

- **Platform:** process-local, per-deal mock construction checklist. It calculates the foundation result only when all five checks are true.
- **Verifier:** a centralized, server-side service. It calls the platform itself (the frontend never supplies a final boolean), then signs `submit_condition_result` using `VERIFIER_KEYPAIR_PATH`.
- **Program:** stores a verifier-controlled result in a deal PDA and releases the exact stored amount from its escrow PDA only after a true result.
- **Frontend:** subscribes directly to SpacetimeDB for live verification state and calls existing API routes for the escrow demo; it has no private key and never sends a result directly to Solana.

## Live verification state with SpacetimeDB

The local SpacetimeDB module is in `spacetime/spacetimedb`. Public `condition`, `verification_check`, `evidence`, and `uploaded_document` tables back the live flow section on the page. All writes go through deterministic reducers; reducers use `ctx.timestamp`, return no data, and make no external calls. The generated browser bindings live in `lib/spacetime/module_bindings`.

For this hackathon demo only, tables are public and reducers are development-open so the browser can create and update flow rows. This is not production authorization. TODO before deployment: restrict writes to an authorized worker identity and scope reads by owner.

### Run the local state demo

Use separate terminals from the repository root:

```bash
npm run spacetime:start
```

```bash
npm run spacetime:publish
```

```bash
npm run dev
```

SpacetimeDB listens on `127.0.0.1:3001` and Next.js uses its usual port 3000. The database name is `condition-oracle`. Override `NEXT_PUBLIC_SPACETIMEDB_URI` or `NEXT_PUBLIC_SPACETIMEDB_DATABASE` in `.env.local` if needed. The checked-in template config is explicitly set to the local server; nothing in this setup publishes to Maincloud. Run `npm run spacetime:generate` after changing the module schema to refresh generated client bindings.

In the **Verification Plan** section, enter a condition and click **Generate verification plan**. The plan and optional document metadata are written through real reducers; subscribed rows appear without a refresh. File bytes, external evidence sources, and Solana settlement are not part of this demonstration.

### Grok planning slice

Set `XAI_API_KEY` in `.env.local` (server side only; never use a `NEXT_PUBLIC_` name). `XAI_MODEL` defaults to `grok-4.3`. The Verification Plan form calls `POST /api/verification-plan`, then creates the condition, optional document metadata, and ordered checks through the existing SpacetimeDB reducers. File bytes are never uploaded or read. The displayed rows come from the existing subscriptions. At this stage, external evidence collection has not started; a future server-side verification worker will own writes after it runs the Reddit, web, and document checks.

### Future API worker boundary

Future Next.js API routes will receive a verification request, call Grok and the selected external tools, normalize findings into structured evidence, then invoke SpacetimeDB reducers to update checks and evidence. A deterministic evaluator will resolve the condition; only a true resolved condition should proceed to the existing Solana verifier. Keep external calls in Next.js routes or workers: reducers must remain deterministic and must not call Grok, Reddit, web search, document parsers, Nessie, filesystem APIs, clocks, randomness, or Solana RPC.

## Intentionally omitted

Real evidence verification, AI/document/image analysis, custom attestations, wallet connections, SPL/stablecoins, banking, mainnet, multi-party oracles, the API worker, and production authorization/key management are intentionally out of scope.
