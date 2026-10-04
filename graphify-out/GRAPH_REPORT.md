# Graph Report - SolanaAbstractionLayer  (2026-10-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 310 nodes · 486 edges · 24 communities (15 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `421dde97`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- module_bindings/index.ts
- package.json
- platform.ts
- lib.rs
- VerificationFlow.tsx
- Solana API Helpers
- src/index.ts
- compilerOptions
- spacetimedb/package.json
- Development Dependencies
- run/route.ts
- scripts
- verification-plan.ts
- Deterministic Condition Evaluator
- layout.tsx
- SpacetimeDB Core Concepts
- next-env.d.ts
- SpacetimeDB CLI
- Reducer Context API
- conditional_escrow
- Conditional Escrow MVP

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `requireCondition()` - 12 edges
3. `scripts` - 11 edges
4. `createAndFundDeal()` - 10 edges
5. `solana()` - 9 edges
6. `submitCondition()` - 9 edges
7. `initializeConstructionChecklist()` - 8 edges
8. `FundDeal` - 8 edges
9. `ReleasePayment` - 8 edges
10. `getPlatformState()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `createAndFundDeal()`  [EXTRACTED]
  app/api/deal/create/route.ts → lib/solana.ts
- `GET()` --calls--> `getPlatformState()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `POST()` --calls--> `updateConstructionCheck()`  [EXTRACTED]
  app/api/platform/result/route.ts → lib/platform.ts
- `GET()` --calls--> `getDeal()`  [EXTRACTED]
  app/api/deal/[dealId]/route.ts → lib/solana.ts
- `POST()` --calls--> `searchReddit()`  [EXTRACTED]
  app/api/verification/run/route.ts → lib/verification-tools/reddit.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Verification to Escrow Release Flow** — readme_platform_checklist, readme_centralized_verifier, readme_anchor_escrow_program [EXTRACTED 1.00]

## Communities (24 total, 6 thin omitted)

### Community 0 - "module_bindings/index.ts"
Cohesion: 0.05
Nodes (28): DbConnection, DbConnectionBuilder, ErrorContext, EventContext, procedures, proceduresSchema, ReducerEventContext, reducersSchema (+20 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (24): dependencies, next, react, react-dom, @solana/web3.js, spacetimedb, name, private (+16 more)

### Community 2 - "platform.ts"
Cohesion: 0.12
Nodes (22): POST(), dynamic, GET(), POST(), CHECK_LABELS, checksFor(), ConditionResult, ConstructionCheck (+14 more)

### Community 3 - "lib.rs"
Cohesion: 0.22
Nodes (25): Account, Context, Program, ConditionResultSubmitted, Config, create_deal(), CreateDeal, Deal (+17 more)

### Community 4 - "VerificationFlow.tsx"
Cohesion: 0.13
Nodes (21): api(), checkDetails, CheckId, explorer(), Home(), PlatformState, reducers, Condition (+13 more)

### Community 5 - "Solana API Helpers"
Cohesion: 0.24
Nodes (18): GET(), POST(), addresses(), conditionHash(), CONFIG_SEED, createAndFundDeal(), DEAL_SEED, discriminator() (+10 more)

### Community 6 - "src/index.ts"
Cohesion: 0.17
Nodes (20): add_evidence, add_verification_check, associate_demo_deal, complete_check, condition, create_condition, evidence, record_settlement_status (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "spacetimedb/package.json"
Cohesion: 0.12
Nodes (15): spacetimedb, typescript, author, dependencies, spacetimedb, description, devDependencies, typescript (+7 more)

### Community 9 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, chai, @coral-xyz/anchor, mocha, postcss, tailwindcss, tsx (+7 more)

### Community 10 - "run/route.ts"
Cohesion: 0.44
Nodes (7): judgeRelevance(), POST(), runtime, searchReddit(), CheckResult, SourceEvidence, searchWeb()

### Community 11 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, anchor:test, build, dev, lint, spacetime:build, spacetime:generate, spacetime:publish (+3 more)

### Community 12 - "verification-plan.ts"
Cohesion: 0.31
Nodes (8): badRequest(), POST(), runtime, allowedKinds, buildPlannerMessages(), parseVerificationPlan(), PlanCheck, VerificationPlan

### Community 13 - "Deterministic Condition Evaluator"
Cohesion: 0.28
Nodes (9): Anchor Escrow Program, Centralized Solana Verifier, Deterministic Condition Evaluator, Future API Verification Worker, Grok Verification Planning Route, Platform Checklist, SpacetimeDB Live Verification State, Deterministic SpacetimeDB Reducers (+1 more)

### Community 15 - "SpacetimeDB Core Concepts"
Cohesion: 0.67
Nodes (3): Deterministic Reducers, SpacetimeDB Core Concepts, Subscriptions

## Knowledge Gaps
- **131 isolated node(s):** `ErrorContext`, `EventContext`, `ReducerEventContext`, `SubscriptionEventContext`, `SubscriptionHandle` (+126 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 146 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `module_bindings/index.ts` to `package.json`, `VerificationFlow.tsx`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `@solana/web3.js` connect `package.json` to `Solana API Helpers`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `package.json`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `ErrorContext`, `EventContext`, `ReducerEventContext` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `module_bindings/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `platform.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._