# Graph Report - SolanaAbstractionLayer  (2026-10-04)

## Corpus Check
- 56 files · ~20,712 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 303 nodes · 461 edges · 23 communities (14 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4b4f0e7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- module_bindings/index.ts
- API and Platform Routes
- package.json
- lib.rs
- VerificationFlow.tsx
- Solana API Helpers
- TypeScript Configuration
- src/index.ts
- spacetimedb/package.json
- Development Dependencies
- Project Scripts
- Deterministic Condition Evaluator
- layout.tsx
- SpacetimeDB Core Concepts
- next-env.d.ts
- SpacetimeDB CLI
- Reducer Context API
- conditional_escrow
- Conditional Escrow MVP
- run/route.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `scripts` - 11 edges
3. `requireCondition()` - 11 edges
4. `createAndFundDeal()` - 10 edges
5. `solana()` - 9 edges
6. `initializeConstructionChecklist()` - 8 edges
7. `FundDeal` - 8 edges
8. `ReleasePayment` - 8 edges
9. `getPlatformState()` - 7 edges
10. `addresses()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getDeal()`  [EXTRACTED]
  app/api/deal/[dealId]/route.ts → lib/solana.ts
- `POST()` --calls--> `createAndFundDeal()`  [EXTRACTED]
  app/api/deal/create/route.ts → lib/solana.ts
- `POST()` --calls--> `releaseDeal()`  [EXTRACTED]
  app/api/deal/release/route.ts → lib/solana.ts
- `GET()` --calls--> `getPlatformState()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `POST()` --calls--> `updateConstructionCheck()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Verification to Escrow Release Flow** — readme_platform_checklist, readme_centralized_verifier, readme_anchor_escrow_program [EXTRACTED 1.00]

## Communities (23 total, 6 thin omitted)

### Community 0 - "module_bindings/index.ts"
Cohesion: 0.06
Nodes (27): DbConnection, DbConnectionBuilder, ErrorContext, EventContext, procedures, proceduresSchema, ReducerEventContext, reducersSchema (+19 more)

### Community 1 - "API and Platform Routes"
Cohesion: 0.13
Nodes (23): POST(), dynamic, GET(), POST(), CHECK_LABELS, checksFor(), ConditionResult, ConstructionCheck (+15 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (26): dependencies, next, react, react-dom, @solana/web3.js, spacetimedb, spacetimedb, typescript (+18 more)

### Community 3 - "lib.rs"
Cohesion: 0.22
Nodes (25): Account, Context, Program, ConditionResultSubmitted, Config, create_deal(), CreateDeal, Deal (+17 more)

### Community 4 - "VerificationFlow.tsx"
Cohesion: 0.12
Nodes (22): badRequest(), POST(), runtime, api(), checkDetails, CheckId, explorer(), Home() (+14 more)

### Community 5 - "Solana API Helpers"
Cohesion: 0.22
Nodes (18): GET(), POST(), addresses(), conditionHash(), CONFIG_SEED, createAndFundDeal(), DEAL_SEED, discriminator() (+10 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "src/index.ts"
Cohesion: 0.18
Nodes (19): add_evidence, add_verification_check, complete_check, condition, create_condition, evidence, record_settlement_status, record_uploaded_document (+11 more)

### Community 8 - "spacetimedb/package.json"
Cohesion: 0.12
Nodes (15): author, dependencies, spacetimedb, description, devDependencies, typescript, spacetimedb, typescript (+7 more)

### Community 9 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, chai, @coral-xyz/anchor, mocha, postcss, tailwindcss, tsx (+7 more)

### Community 10 - "Project Scripts"
Cohesion: 0.18
Nodes (11): scripts, anchor:test, build, dev, lint, spacetime:build, spacetime:generate, spacetime:publish (+3 more)

### Community 12 - "Deterministic Condition Evaluator"
Cohesion: 0.28
Nodes (9): Anchor Escrow Program, Centralized Solana Verifier, Deterministic Condition Evaluator, Future API Verification Worker, Grok Verification Planning Route, Platform Checklist, SpacetimeDB Live Verification State, Deterministic SpacetimeDB Reducers (+1 more)

### Community 14 - "SpacetimeDB Core Concepts"
Cohesion: 0.67
Nodes (3): Deterministic Reducers, SpacetimeDB Core Concepts, Subscriptions

### Community 23 - "run/route.ts"
Cohesion: 0.44
Nodes (7): judgeRelevance(), POST(), runtime, searchReddit(), CheckResult, SourceEvidence, searchWeb()

## Knowledge Gaps
- **132 isolated node(s):** `dynamic`, `runtime`, `runtime`, `metadata`, `checkDetails` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 148 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `module_bindings/index.ts` to `package.json`, `VerificationFlow.tsx`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Why does `@solana/web3.js` connect `package.json` to `Solana API Helpers`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `dynamic`, `runtime`, `runtime` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `module_bindings/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056429232192414434 - nodes in this community are weakly interconnected._
- **Should `API and Platform Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._