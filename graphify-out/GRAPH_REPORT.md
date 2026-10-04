# Graph Report - SolanaAbstractionLayer  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 272 nodes · 410 edges · 20 communities (12 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `963473d4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- module_bindings/index.ts
- platform.ts
- package.json
- VerificationFlow.tsx
- lib.rs
- solana.ts
- compilerOptions
- src/index.ts
- spacetimedb/package.json
- devDependencies
- scripts
- SpacetimeDB Live Verification State
- layout.tsx
- next-env.d.ts
- SpacetimeDB CLI
- Reducer Context API
- conditional_escrow

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `scripts` - 11 edges
3. `requireCondition()` - 10 edges
4. `createAndFundDeal()` - 9 edges
5. `solana()` - 9 edges
6. `initializeConstructionChecklist()` - 8 edges
7. `FundDeal` - 8 edges
8. `ReleasePayment` - 8 edges
9. `getPlatformState()` - 7 edges
10. `addresses()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `initializeConstructionChecklist()`  [EXTRACTED]
  app/api/deal/create/route.ts → lib/platform.ts
- `GET()` --calls--> `getPlatformState()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `POST()` --calls--> `updateConstructionCheck()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `GET()` --calls--> `getDeal()`  [EXTRACTED]
  app/api/deal/[dealId]/route.ts → lib/solana.ts
- `POST()` --calls--> `releaseDeal()`  [EXTRACTED]
  app/api/deal/release/route.ts → lib/solana.ts

## Import Cycles
- None detected.

## Communities (20 total, 5 thin omitted)

### Community 0 - "module_bindings/index.ts"
Cohesion: 0.07
Nodes (20): ErrorContext, EventContext, procedures, proceduresSchema, ReducerEventContext, reducersSchema, REMOTE_MODULE, SubscriptionEventContext (+12 more)

### Community 1 - "platform.ts"
Cohesion: 0.13
Nodes (23): POST(), dynamic, GET(), POST(), CHECK_LABELS, checksFor(), ConditionResult, ConstructionCheck (+15 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (24): dependencies, next, react, react-dom, @solana/web3.js, spacetimedb, name, private (+16 more)

### Community 3 - "VerificationFlow.tsx"
Cohesion: 0.11
Nodes (21): api(), checkDetails, CheckId, explorer(), Home(), PlatformState, DbConnection, DbConnectionBuilder (+13 more)

### Community 4 - "lib.rs"
Cohesion: 0.22
Nodes (25): Account, Context, Program, ConditionResultSubmitted, Config, create_deal(), CreateDeal, Deal (+17 more)

### Community 5 - "solana.ts"
Cohesion: 0.22
Nodes (18): GET(), POST(), addresses(), conditionHash(), CONFIG_SEED, createAndFundDeal(), DEAL_SEED, discriminator() (+10 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "src/index.ts"
Cohesion: 0.18
Nodes (18): add_evidence, add_verification_check, complete_check, condition, create_condition, evidence, record_settlement_status, record_uploaded_document (+10 more)

### Community 8 - "spacetimedb/package.json"
Cohesion: 0.12
Nodes (15): spacetimedb, typescript, author, dependencies, spacetimedb, description, devDependencies, typescript (+7 more)

### Community 9 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, chai, @coral-xyz/anchor, mocha, postcss, tailwindcss, tsx (+7 more)

### Community 10 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, anchor:test, build, dev, lint, spacetime:build, spacetime:generate, spacetime:publish (+3 more)

### Community 11 - "SpacetimeDB Live Verification State"
Cohesion: 0.33
Nodes (7): Conditional Escrow MVP, Future API Worker Boundary, SpacetimeDB Live Verification State, Live Verification Flow, Deterministic Reducers, SpacetimeDB Core Concepts, Subscriptions

## Knowledge Gaps
- **121 isolated node(s):** `ErrorContext`, `EventContext`, `ReducerEventContext`, `SubscriptionEventContext`, `SubscriptionHandle` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `VerificationFlow.tsx` to `package.json`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `@solana/web3.js` connect `package.json` to `solana.ts`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `ErrorContext`, `EventContext`, `ReducerEventContext` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `module_bindings/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06984126984126984 - nodes in this community are weakly interconnected._
- **Should `platform.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._