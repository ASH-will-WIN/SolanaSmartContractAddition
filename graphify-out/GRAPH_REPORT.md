# Graph Report - SolanaAbstractionLayer  (2026-10-04)

## Corpus Check
- 4 files · ~19,427 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 287 nodes · 430 edges · 23 communities (14 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- SpacetimeDB Client Bindings
- API and Platform Routes
- Package Dependencies
- Anchor Escrow Program
- Frontend Escrow State
- Solana API Helpers
- TypeScript Configuration
- SpacetimeDB Reducers
- SpacetimeDB Module Package
- Development Dependencies
- Project Scripts
- Grok Planning Endpoint
- System Architecture Overview
- Next.js Page Layout
- SpacetimeDB Documentation
- Next.js Type Definitions
- SpacetimeDB Module Guides
- SpacetimeDB SDK Documentation
- Anchor Program Package
- Project README Overview

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

## Hyperedges (group relationships)
- **Verification to Escrow Release Flow** — readme_platform_checklist, readme_centralized_verifier, readme_anchor_escrow_program [EXTRACTED 1.00]

## Communities (23 total, 6 thin omitted)

### Community 0 - "SpacetimeDB Client Bindings"
Cohesion: 0.07
Nodes (20): ErrorContext, EventContext, procedures, proceduresSchema, ReducerEventContext, reducersSchema, REMOTE_MODULE, SubscriptionEventContext (+12 more)

### Community 1 - "API and Platform Routes"
Cohesion: 0.13
Nodes (23): POST(), dynamic, GET(), POST(), CHECK_LABELS, checksFor(), ConditionResult, ConstructionCheck (+15 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.07
Nodes (24): dependencies, next, react, react-dom, @solana/web3.js, spacetimedb, name, private (+16 more)

### Community 3 - "Anchor Escrow Program"
Cohesion: 0.22
Nodes (25): Account, Context, Program, ConditionResultSubmitted, Config, create_deal(), CreateDeal, Deal (+17 more)

### Community 4 - "Frontend Escrow State"
Cohesion: 0.12
Nodes (20): api(), checkDetails, CheckId, explorer(), Home(), PlatformState, DbConnection, DbConnectionBuilder (+12 more)

### Community 5 - "Solana API Helpers"
Cohesion: 0.22
Nodes (18): GET(), POST(), addresses(), conditionHash(), CONFIG_SEED, createAndFundDeal(), DEAL_SEED, discriminator() (+10 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "SpacetimeDB Reducers"
Cohesion: 0.18
Nodes (18): add_evidence, add_verification_check, complete_check, condition, create_condition, evidence, record_settlement_status, record_uploaded_document (+10 more)

### Community 8 - "SpacetimeDB Module Package"
Cohesion: 0.12
Nodes (15): spacetimedb, typescript, author, dependencies, spacetimedb, description, devDependencies, typescript (+7 more)

### Community 9 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, chai, @coral-xyz/anchor, mocha, postcss, tailwindcss, tsx (+7 more)

### Community 10 - "Project Scripts"
Cohesion: 0.18
Nodes (11): scripts, anchor:test, build, dev, lint, spacetime:build, spacetime:generate, spacetime:publish (+3 more)

### Community 11 - "Grok Planning Endpoint"
Cohesion: 0.31
Nodes (8): badRequest(), POST(), runtime, allowedKinds, buildPlannerMessages(), parseVerificationPlan(), PlanCheck, VerificationPlan

### Community 12 - "System Architecture Overview"
Cohesion: 0.28
Nodes (9): Anchor Escrow Program, Centralized Solana Verifier, Deterministic Condition Evaluator, Future API Verification Worker, Grok Verification Planning Route, Platform Checklist, SpacetimeDB Live Verification State, Deterministic SpacetimeDB Reducers (+1 more)

### Community 14 - "SpacetimeDB Documentation"
Cohesion: 0.67
Nodes (3): Deterministic Reducers, SpacetimeDB Core Concepts, Subscriptions

## Knowledge Gaps
- **126 isolated node(s):** `ErrorContext`, `EventContext`, `ReducerEventContext`, `SubscriptionEventContext`, `SubscriptionHandle` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 142 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Frontend Escrow State` to `Package Dependencies`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `@solana/web3.js` connect `Package Dependencies` to `Solana API Helpers`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `Package Dependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `ErrorContext`, `EventContext`, `ReducerEventContext` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SpacetimeDB Client Bindings` be split into smaller, more focused modules?**
  _Cohesion score 0.06984126984126984 - nodes in this community are weakly interconnected._
- **Should `API and Platform Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._